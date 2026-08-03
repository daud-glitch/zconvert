/**
 * Process-local convert concurrency gate.
 * Protects a single web dyno under traffic (not a multi-dyno worker yet —
 * that would need Redis + separate worker process).
 *
 * Env:
 *   CONVERT_MAX_CONCURRENT   — non-video slots (default 3)
 *   CONVERT_MAX_VIDEO        — video slots (default 1)
 *   CONVERT_MAX_QUEUE        — waiting callers before 503 (default 20)
 */

type Waiter = {
  isVideo: boolean;
  resolve: () => void;
  reject: (err: Error) => void;
};

const MAX_LIGHT = Math.max(
  1,
  Number(process.env.CONVERT_MAX_CONCURRENT || "3") || 3,
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

function canRun(isVideo: boolean): boolean {
  if (isVideo) return activeVideo < MAX_VIDEO;
  return activeLight < MAX_LIGHT;
}

function pump(): void {
  while (queue.length > 0) {
    const next = queue[0];
    if (!canRun(next.isVideo)) break;
    queue.shift();
    if (next.isVideo) activeVideo += 1;
    else activeLight += 1;
    next.resolve();
  }
}

function acquire(isVideo: boolean): Promise<void> {
  if (canRun(isVideo) && queue.length === 0) {
    if (isVideo) activeVideo += 1;
    else activeLight += 1;
    return Promise.resolve();
  }

  const position = queue.length + 1;
  if (queue.length >= MAX_QUEUE) {
    return Promise.reject(new ConvertQueueFullError(position));
  }

  return new Promise<void>((resolve, reject) => {
    queue.push({ isVideo, resolve, reject });
  });
}

function release(isVideo: boolean): void {
  if (isVideo) activeVideo = Math.max(0, activeVideo - 1);
  else activeLight = Math.max(0, activeLight - 1);
  pump();
}

/** Estimated queue position for clients (1 = next up after current actives). */
export function convertQueueDepth(): {
  waiting: number;
  activeLight: number;
  activeVideo: number;
} {
  return { waiting: queue.length, activeLight, activeVideo };
}

/**
 * Run work only when a convert slot is free.
 * Callers waiting join an in-process FIFO line.
 */
export async function withConvertSlot<T>(
  isVideo: boolean,
  work: () => Promise<T>,
): Promise<T> {
  await acquire(isVideo);
  try {
    return await work();
  } finally {
    release(isVideo);
  }
}
