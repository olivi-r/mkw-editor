import { Parser } from "binary-parser";
import { PAT0 } from "./pat0.js";
import { PLT0 } from "./plt0.js";
import { TEX0 } from "./tex0.js";
import { IndexGroupEntry } from "./util.js";

const RootIndexGroup = new Parser()
  .saveOffset("brresOffset", {
    formatter: function (offset) {
      return -offset;
    },
  })
  .seek(4) // ignore size
  .uint32("length")
  .seek(16) // skip root node
  .array("directories", {
    length: "length",
    type: new Parser().nest({ type: IndexGroupEntry }).pointer("files", {
      offset: function () {
        return this.offset - this.$parent.brresOffset;
      },
      type: new Parser()
        .saveOffset("brresOffset", {
          formatter: function (offset) {
            return -offset;
          },
        })
        .seek(4) // ignore size
        .uint32("length")
        .seek(16) // skip root node
        .array("files", {
          length: "length",
          type: new Parser().nest({
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              formatter: function (item) {
                return item.data;
              },
              type: new Parser().choice("data", {
                tag: function () {
                  switch (this.$parent.$parent.$parent.name) {
                    case "3DModels(NW4R)":
                      return 0;
                    case "Textures(NW4R)":
                      return 1;
                    case "AnmTexSrt(NW4R)":
                      return 2;
                    case "AnmChr(NW4R)":
                      return 3;
                    case "AnmTexPat(NW4R)":
                      return 4;
                    case "AnmClr(NW4R)":
                      return 5;
                    case "AnmShp(NW4R)":
                      return 6;
                    case "AnmScn(NW4R)":
                      return 7;
                    case "Palettes(NW4R)":
                      return 8;
                    case "AnmVis(NW4R)":
                      return 9;
                  }
                },
                choices: {
                  0: new Parser(),
                  1: TEX0,
                  2: new Parser(),
                  3: new Parser(),
                  4: PAT0,
                  5: new Parser(),
                  6: new Parser(),
                  7: new Parser(),
                  8: PLT0,
                  9: new Parser(),
                },
              }),
            }),
            formatter: function (item) {
              return item.data;
            },
          }),
        }),
      formatter: function (item) {
        return item.files;
      },
    }),
  });

const _BRRES = new Parser()
  .seek(6) // ignore unused version field and file size
  .uint16("offset")
  .seek(2) // ignore number of sections
  .pointer("root", {
    offset: "offset",
    type: new Parser()
      .string("magic", { length: 4, assert: "root" })
      .uint32("size")
      .nest({ type: RootIndexGroup }),
  });

export const BRRES = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "bres" })
  .uint16be("bom")
  .choice({
    tag: "bom",
    choices: {
      65279: new Parser().endianness("big").nest({ type: _BRRES }),
      65534: new Parser().endianness("little").nest({ type: _BRRES }),
    },
  });
