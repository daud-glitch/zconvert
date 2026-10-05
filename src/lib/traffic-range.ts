/**
 * Time ranges offered by the admin panel's Traffic Sources card.
 *
 * Only the traffic-source breakdown is range-aware; the other admin metrics
 * stay on their existing windows.
 */
export const TRAFFIC_RANGES = ["1d", "7d", "30d", "all"] as const;

export type TrafficRange = (typeof TRAFFIC_RANGES)[number];

export const DEFAULT_TRAFFIC_RANGE: TrafficRange = "30d";

/** Unknown or missing values fall back to the default rather than failing. */
export function parseTrafficRange(value: unknown): TrafficRange {
  return TRAFFIC_RANGES.includes(value as TrafficRange)
    ? (value as TrafficRange)
    : DEFAULT_TRAFFIC_RANGE;
}

/** Days covered by the range, or null for all time. */
export function trafficRangeDays(range: TrafficRange): number | null {
  switch (range) {
    case "1d":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    default:
      return null;
  }
}

/** Lower bound for the range, or null when no bound should be applied. */
export function trafficSince(
  range: TrafficRange,
  now: number = Date.now(),
): Date | null {
  const days = trafficRangeDays(range);
  return days === null ? null : new Date(now - days * 24 * 60 * 60 * 1000);
}

/** Short button label. */
export function trafficRangeLabel(range: TrafficRange): string {
  const days = trafficRangeDays(range);
  return days === null ? "All time" : `${days}d`;
}

/** Human phrase for the summary badge. */
export function trafficRangePhrase(range: TrafficRange): string {
  const days = trafficRangeDays(range);
  return days === null
    ? "All time"
    : `Last ${days} day${days === 1 ? "" : "s"}`;
}