import { describe, expect, it } from "vitest";
import {
  parseSbv,
  toSbv,
  parseLrc,
  toLrc,
  parseIcs,
  toIcs,
  parseM3u,
  toM3u,
  parseGeoJson,
  toGeoJson,
} from "@/lib/light-text-formats";

describe("light-text-formats", () => {
  it("round-trips SBV cues", () => {
    const src = "0:00:01.000,0:00:03.000\nHello\n\n0:00:03.500,0:00:05.000\nWorld\n";
    const cues = parseSbv(src);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("Hello");
    const out = toSbv(cues);
    expect(out).toContain("Hello");
    expect(parseSbv(out)).toHaveLength(2);
  });

  it("parses LRC lyrics", () => {
    const cues = parseLrc("[00:12.00]First line\n[00:15.50]Second line\n");
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("First line");
    expect(toLrc(cues)).toContain("First line");
  });

  it("parses ICS events to records", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Standup",
      "DTSTART:20240101T090000Z",
      "DTEND:20240101T093000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const records = parseIcs(ics);
    expect(records[0].summary).toBe("Standup");
    expect(toIcs(records)).toContain("SUMMARY:Standup");
  });

  it("parses M3U playlists", () => {
    const records = parseM3u("#EXTM3U\n#EXTINF:-1,Song\nhttps://example.com/a.mp3\n");
    expect(records).toEqual([{ title: "Song", url: "https://example.com/a.mp3" }]);
    expect(toM3u(records)).toContain("https://example.com/a.mp3");
  });

  it("converts GeoJSON points to records and back", () => {
    const geo = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "A" },
          geometry: { type: "Point", coordinates: [67.0, 24.8] },
        },
      ],
    });
    const records = parseGeoJson(geo);
    expect(records[0].name).toBe("A");
    expect(records[0].longitude).toBe(67);
    const back = JSON.parse(toGeoJson(records));
    expect(back.type).toBe("FeatureCollection");
    expect(back.features[0].geometry.coordinates).toEqual([67, 24.8]);
  });
});
