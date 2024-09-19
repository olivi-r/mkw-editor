import { Parser } from "binary-parser";
import { IndexGroupEntry } from "../../util.js";

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

export const TextureLinkSection = new Parser().choice({
  tag: function () {
    return this.textureLinkOffset === 0 ? 0 : 1;
  },
  choices: {
    0: new Parser(),
    1: new Parser().pointer("textureLinks", {
      offset: function () {
        return this.textureLinkOffset - this.brresOffset;
      },
      type: new Parser()
        .saveOffset("brresOffset", { formatter: (item) => -item })
        .seek(4)
        .uint32("length")
        .seek(16)
        .array("entries", {
          length: "length",
          type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
            offset: function () {
              return this.offset - this.$parent.brresOffset;
            },
            type: TexturePaletteLink,
          }),
        }),
      formatter: (item) => item.entries.map((e) => e.data),
    }),
  },
});

export const PaletteLinkSection = new Parser().choice({
  tag: function () {
    return this.paletteLinkOffset === 0 ? 0 : 1;
  },
  choices: {
    0: new Parser(),
    1: new Parser().pointer("paletteLinks", {
      offset: function () {
        return this.paletteLinkOffset - this.brresOffset;
      },
      type: new Parser()
        .saveOffset("brresOffset", { formatter: (item) => -item })
        .seek(4)
        .uint32("length")
        .seek(16)
        .array("entries", {
          length: "length",
          type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
            offset: function () {
              return this.offset - this.$parent.brresOffset;
            },
            type: TexturePaletteLink,
          }),
        }),
      formatter: (item) => item.entries.map((e) => e.data),
    }),
  },
});
