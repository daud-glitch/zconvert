/**
 * Process-local convert concurrency gate.
 * Protects a single dyno under traffic (web or worker process).
 *
 * Env:
 *   CONVERT_MAX_CONCURRENT   — non-video slots (default 5)
 *   CONVERT_MAX_VIDEO        — video slots (default 1)
 *   CONVERT_MAX_QUEUE        — waiting callers before 503 (default 20)
 *
 * Wait line policy:
 *   1) non-video before video
 *   2) smaller inputs before larger (same class)
 *   3) FIFO for ties
 */

type Waiter = {
  isVideo: boolean;
  sizeBytes: number;
  enqueuedAt: number;
  resolve: () => void;
  reject: (err: Error) => void;
};

const MAX_LIGHT = Math.max(
  1,
  Number(process.env.CONVERT_MAX_CONCURRENT || "5") || 5,
);
const MAX_VIDEO = Math.max(
  1,
  Number(process.env.CONVERT_MAX_VIDEO || "1") || 1,
);
const MAX_QUEUE = Math.max(
  0,
  Number(process.env.CONVERT_MAX_QUEUE || "20") || 20,
);

let activeLight = 0;
let activeVideo = 0;
const queue: Waiter[] = [];

export class ConvertQueueFullError extends Error {
  readonly status = 503;
  readonly position: number;
  constructor(position: number) {
    super(
      position > 0
        ? `Server is busy converting other files. You are about #${position} in line — wait a moment and retry.`
        : "Server is busy converting other files. Wait a moment and retry.",
    );
    this.name = "ConvertQueueFullError";
    this.position = position;
  }
}

export function convertSlotLimits(): {
  maxLight: number;
  maxVideo: number;
  maxQueue: number;
} {
  return { maxLight: MAX_LIGHT, maxVideo: MAX_VIDEO, maxQueue: MAX_QUEUE };
}

function canRun(isVideo: boolean): boolean {
  if (isVideo) return activeVideo < MAX_VIDEO;
  return activeLight < MAX_LIGHT;
}

/** Smaller / light work first; stable FIFO for equal size. */
export function compareConvertWaiters(
  a: Pick<Waiter, "isVideo" | "sizeBytes" | "enqueuedAt">,
  b: Pick<Waiter, "isVideo" | "sizeBytes" | "enqueuedAt">,
): number {
  if (a.isVideo !== b.isVideo) return a.isVideo ? 1 : -1;
  if (a.sizeBytes !== b.sizeBytes) return a.sizeBytes - b.sizeBytes;
  return a.enqueuedAt - b.enqueuedAt;
}

function insertWaiter(waiter: Waiter): void {
  let i = 0;
  while (i < queue.length && compareConvertWaiters(queue[i], waiter) <= 0) {
    i += 1;
  }
  queue.splice(i, 0, waiter);
}

/**
 * Start any waiters that fit free slots. Skips over blocked video waiters
 * when light slots are free (and vice versa).
 */
function pump(): void {
  let i = 0;
  while (i < queue.length) {
    const next = queue[i];
    if (!canRun(next.isVideo)) {
      i += 1;
      continue;
    }
    queue.splice(i, 1);
    if (next.isVideo) activeVideo += 1;
    else activeLight += 1;
    next.resolve();
  }
}

/** Count waiters of the same class ahead of a new request (for messaging). */
function queuePositionHint(isVideo: boolean): number {
  const sameClass = queue.filter((w) => w.isVideo === isVideo).length;
  return sameClass + 1;
}

function acquire(isVideo: boolean, sizeBytes: number): Promise<void> {
  // Prefer existing same-class waiters (already sorted small-first)
  const sameClassWaiting = queue.some((w) => w.isVideo === isVideo);
  if (canRun(isVideo) && !sameClassWaiting) {
    if (isVideo) activeVideo += 1;
    else activeLight += 1;
    return Promise.resolve();
  }

  if (queue.length >= MAX_QUEUE) {
    return Promise.reject(new ConvertQueueFullError(queuePositionHint(isVideo)));
  }

  return new Promise<void>((resolve, reject) => {
    insertWaiter({
      isVideo,
      sizeBytes: Math.max(0, sizeBytes || 0),
      enqueuedAt: Date.now(),
      resolve,
      reject,
    });
    pump();
  });
}

function release(isVideo: boolean): void {
  if (isVideo) activeVideo = Math.max(0, activeVideo - 1);
  else activeLight = Math.max(0, activeLight - 1);
  pump();
}

/** Estimated queue depth for clients. */
export function convertQueueDepth(): {
  waiting: number;
  activeLight: number;
  activeVideo: number;
} {
  return { waiting: queue.length, activeLight, activeVideo };
}

/**
 * Run work only when a convert slot is free.
 * Optional sizeBytes prioritizes smaller files among waiters.
 */
export async function withConvertSlot<T>(
  isVideo: boolean,
  work: () => Promise<T>,
  sizeBytes = 0,
): Promise<T> {
  await acquire(isVideo, sizeBytes);
  try {
    return await work();
  } finally {
    release(isVideo);
  }
}
