import { Parser } from "binary-parser";
import { Section } from "../../util.js";

const TexturePaletteLink = new Parser().nest({
  type: new Parser()
    .saveOffset("brresOffset", { formatter: (item) => -item })
    .uint32("length")
    .array("entries", {
      length: "length",
      type: new Parser().int32("materialOffset").int32("textureOffset"),
    }),
  formatter: (item) => item.entries,
});

export const TextureLinkSection = Section(
  "textureLinkOffset",
  "textureLinks",
  TexturePaletteLink,
  (item) => item.entries
);

export const PaletteLinkSection = Section(
  "paletteLinkOffset",
  "paletteLinks",
  TexturePaletteLink,
  (item) => item.entries
);
