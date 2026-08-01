/**
 * Lightweight text-only format helpers (SBV, LRC, ICS, M3U, GeoJSON).
 * No ffmpeg/sharp — pure string/JSON transforms.
 */

export interface SubtitleCue {
  index: number;
  start: string; // HH:MM:SS,mmm
  end: string;
  text: string;
}

function padTime(h: number, m: number, s: number, ms: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function parseLooseTime(raw: string): string {
  const t = raw.trim().replace(",", ".");
  // H:MM:SS.mmm or HH:MM:SS.mmm
  let m = t.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (m) {
    const ms = (m[4] || "0").padEnd(3, "0").slice(0, 3);
    return padTime(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(ms, 10));
  }
  // MM:SS.xx (LRC-style)
  m = t.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (m) {
    const ms = (m[3] || "0").padEnd(3, "0").slice(0, 3);
    return padTime(0, parseInt(m[1], 10), parseInt(m[2], 10), parseInt(ms, 10));
  }
  return "00:00:00,000";
}

function cueToSeconds(cue: string): number {
  const m = cue.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!m) return 0;
  return (
    parseInt(m[1], 10) * 3600 +
    parseInt(m[2], 10) * 60 +
    parseInt(m[3], 10) +
    parseInt(m[4], 10) / 1000
  );
}

function secondsToLrc(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
}

function sbvTime(cue: string): string {
  // SBV uses H:MM:SS.mmm (hours may be 1 digit)
  const m = cue.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!m) return "0:00:00.000";
  const h = parseInt(m[1], 10);
  return `${h}:${m[2]}:${m[3]}.${m[4]}`;
}

/** YouTube SubViewer (SBV) */
export function parseSbv(text: string): SubtitleCue[] {
  const entries: SubtitleCue[] = [];
  const blocks = text.trim().replace(/\r\n/g, "\n").split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const timeMatch = lines[0].match(
      /^(\d{1,2}:\d{2}:\d{2}(?:[.,]\d{1,3})?)\s*,\s*(\d{1,2}:\d{2}:\d{2}(?:[.,]\d{1,3})?)$/,
    );
    if (!timeMatch) continue;
    entries.push({
      index: entries.length + 1,
      start: parseLooseTime(timeMatch[1]),
      end: parseLooseTime(timeMatch[2]),
      text: lines.slice(1).join("\n"),
    });
  }
  return entries;
}

export function toSbv(entries: SubtitleCue[]): string {
  return (
    entries
      .map((e) => `${sbvTime(e.start)},${sbvTime(e.end)}\n${e.text}`)
      .join("\n\n") + "\n"
  );
}

/** LRC lyrics (start tags only; end inferred) */
export function parseLrc(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const raw: { startSec: number; text: string }[] = [];
  for (const line of lines) {
    const tags = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (tags.length === 0) continue;
    const lyric = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();
    if (!lyric) continue;
    for (const tag of tags) {
      const min = parseInt(tag[1], 10);
      const sec = parseInt(tag[2], 10);
      const frac = (tag[3] || "0").padEnd(3, "0").slice(0, 3);
      const startSec = min * 60 + sec + parseInt(frac, 10) / 1000;
      raw.push({ startSec, text: lyric });
    }
  }
  raw.sort((a, b) => a.startSec - b.startSec);
  return raw.map((r, i) => {
    const endSec = raw[i + 1] ? raw[i + 1].startSec : r.startSec + 3;
    const toCue = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.round((sec % 1) * 1000);
      return padTime(h, m, s, ms);
    };
    return {
      index: i + 1,
      start: toCue(r.startSec),
      end: toCue(endSec),
      text: r.text,
    };
  });
}

export function toLrc(entries: SubtitleCue[]): string {
  return (
    entries.map((e) => `${secondsToLrc(cueToSeconds(e.start))}${e.text}`).join("\n") +
    "\n"
  );
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

/** Parse VEVENT records from ICS */
export function parseIcs(text: string): Record<string, unknown>[] {
  const normalized = unfoldIcs(text);
  const events: Record<string, unknown>[] = [];
  const blocks = normalized.split(/BEGIN:VEVENT/i).slice(1);
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] || "";
    const rec: Record<string, string> = {};
    for (const line of body.split("\n")) {
      const idx = line.indexOf(":");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).split(";")[0].trim().toUpperCase();
      const val = line.slice(idx + 1).trim();
      if (!key) continue;
      if (key === "SUMMARY") rec.summary = val;
      else if (key === "DESCRIPTION") rec.description = val;
      else if (key === "LOCATION") rec.location = val;
      else if (key === "DTSTART") rec.dtstart = val;
      else if (key === "DTEND") rec.dtend = val;
      else if (key === "UID") rec.uid = val;
      else if (key === "STATUS") rec.status = val;
    }
    if (Object.keys(rec).length) events.push(rec);
  }
  if (events.length === 0) {
    return [{ content: text.slice(0, 2000) }];
  }
  return events;
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function toIcs(records: Record<string, unknown>[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//zConvert//EN",
    "CALSCALE:GREGORIAN",
  ];
  records.forEach((r, i) => {
    const summary = String(r.summary ?? r.title ?? r.name ?? `Event ${i + 1}`);
    const description = String(r.description ?? r.desc ?? r.notes ?? "");
    const location = String(r.location ?? r.place ?? "");
    const dtstart = String(r.dtstart ?? r.start ?? r.date ?? "").replace(/[-:]/g, "").replace(/\.\d+Z?$/i, "Z");
    const dtend = String(r.dtend ?? r.end ?? "").replace(/[-:]/g, "").replace(/\.\d+Z?$/i, "Z");
    const uid = String(r.uid ?? `zconvert-${Date.now()}-${i}@local`);
    lines.push("BEGIN:VEVENT");
    lines.push(foldIcsLine(`UID:${icsEscape(uid)}`));
    lines.push(foldIcsLine(`SUMMARY:${icsEscape(summary)}`));
    if (description) lines.push(foldIcsLine(`DESCRIPTION:${icsEscape(description)}`));
    if (location) lines.push(foldIcsLine(`LOCATION:${icsEscape(location)}`));
    if (dtstart) lines.push(`DTSTART:${dtstart}`);
    if (dtend) lines.push(`DTEND:${dtend}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** M3U / M3U8 playlist entries */
export function parseM3u(text: string): Record<string, unknown>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const records: Record<string, unknown>[] = [];
  let pendingTitle = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "#EXTM3U") continue;
    if (line.startsWith("#EXTINF:")) {
      const comma = line.indexOf(",");
      pendingTitle = comma >= 0 ? line.slice(comma + 1).trim() : "";
      continue;
    }
    if (line.startsWith("#")) continue;
    records.push({
      title: pendingTitle || line.split("/").pop() || "Track",
      url: line,
    });
    pendingTitle = "";
  }
  return records;
}

export function toM3u(records: Record<string, unknown>[]): string {
  const lines = ["#EXTM3U"];
  for (const r of records) {
    const title = String(r.title ?? r.name ?? r.summary ?? "Track");
    const url = String(r.url ?? r.path ?? r.link ?? r.src ?? "");
    if (!url) continue;
    lines.push(`#EXTINF:-1,${title}`);
    lines.push(url);
  }
  return lines.join("\n") + "\n";
}

function pickCoord(obj: Record<string, unknown>): [number, number] | null {
  const lon = obj.lon ?? obj.lng ?? obj.longitude ?? obj.x;
  const lat = obj.lat ?? obj.latitude ?? obj.y;
  if (typeof lon === "number" && typeof lat === "number") return [lon, lat];
  if (lon != null && lat != null) {
    const a = Number(lon);
    const b = Number(lat);
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
  }
  return null;
}

/** GeoJSON → flat records (one per feature / point) */
export function parseGeoJson(text: string): Record<string, unknown>[] {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const type = String(parsed.type || "");

  const featureToRecord = (f: Record<string, unknown>): Record<string, unknown> => {
    const props =
      f.properties && typeof f.properties === "object"
        ? { ...(f.properties as Record<string, unknown>) }
        : {};
    const geom = f.geometry as Record<string, unknown> | undefined;
    if (geom && Array.isArray(geom.coordinates)) {
      const coords = geom.coordinates as unknown[];
      if (geom.type === "Point" && typeof coords[0] === "number") {
        props.longitude = coords[0];
        props.latitude = coords[1];
      }
      props.geometry_type = geom.type;
      props.coordinates = JSON.stringify(coords);
    }
    if (f.id != null) props.id = f.id;
    return props;
  };

  if (type === "FeatureCollection" && Array.isArray(parsed.features)) {
    return (parsed.features as Record<string, unknown>[]).map(featureToRecord);
  }
  if (type === "Feature") {
    return [featureToRecord(parsed)];
  }
  if (type === "Point" && Array.isArray(parsed.coordinates)) {
    const c = parsed.coordinates as number[];
    return [{ longitude: c[0], latitude: c[1], geometry_type: "Point" }];
  }
  // Generic JSON object/array fallback
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }
  return [parsed];
}

/** Records → GeoJSON FeatureCollection (Point when lat/lon present) */
export function toGeoJson(records: Record<string, unknown>[]): string {
  const features = records.map((r, i) => {
    const coords = pickCoord(r);
    if (coords) {
      const { lon: _a, lng: _b, longitude: _c, lat: _d, latitude: _e, x: _f, y: _g, ...rest } =
        r as Record<string, unknown> & {
          lon?: unknown;
          lng?: unknown;
          longitude?: unknown;
          lat?: unknown;
          latitude?: unknown;
          x?: unknown;
          y?: unknown;
        };
      return {
        type: "Feature",
        id: r.id ?? i + 1,
        properties: rest,
        geometry: { type: "Point", coordinates: coords },
      };
    }
    if (typeof r.coordinates === "string" || Array.isArray(r.coordinates)) {
      let coordinates: unknown = r.coordinates;
      if (typeof coordinates === "string") {
        try {
          coordinates = JSON.parse(coordinates);
        } catch {
          coordinates = [];
        }
      }
      const { coordinates: _c, geometry_type: gtype, ...rest } = r;
      return {
        type: "Feature",
        id: r.id ?? i + 1,
        properties: rest,
        geometry: {
          type: String(gtype || "Geometry"),
          coordinates,
        },
      };
    }
    return {
      type: "Feature",
      id: r.id ?? i + 1,
      properties: { ...r },
      geometry: null,
    };
  });

  return JSON.stringify({ type: "FeatureCollection", features }, null, 2);
}
