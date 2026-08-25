export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

/** User-facing product fixes and improvements, newest first. */
export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-08-25",
    title: "Conversion fixes",
    items: [
      "DrawIO (.drawio) diagrams now convert to PNG, JPG, and SVG by rendering shapes and connectors — previously PNG export failed unless the file already contained an embedded image.",
    ],
  },
  {
    date: "2026-08-24",
    title: "Conversion fixes",
    items: [
      "BLP (Blizzard texture) files now convert correctly. Palettized, DXT, and uncompressed BLP2 textures that previously failed with “BLP2 compression 0 not supported” can be converted to BMP, AVIF, PNG, and other image formats.",
    ],
  },
];
