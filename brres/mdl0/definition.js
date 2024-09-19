import { Parser } from "binary-parser";
import { IndexGroupEntry } from "../../util.js";

const Definition = new Parser().nest({
  type: new Parser().array("entries", {
    type: new Parser().uint8("code").choice({
      tag: "code",
      choices: {
        0: new Parser(),
        1: new Parser(),
        2: new Parser().uint16("boneIndex").uint16("parentMatrixIndex"),
        3: new Parser()
          .uint16("index")
          .uint8("length")
          .array("entries", {
            length: "length",
            type: new Parser().uint16("matrixIndex").floatbe("weight"),
          }),
        4: new Parser()
          .uint16("materialIndex")
          .uint16("objectIndex")
          .uint16("boneIndex")
          .uint8("priority"),
        5: new Parser().uint16("matrixIndex").uint16("boneIndex"),
      },
    }),
    readUntil: (item) => item.code === 1,
    formatter: (item) => item.slice(0, -1),
  }),
  formatter: (item) => item.entries,
});

export const DefinitionSection = new Parser().choice({
  tag: function () {
    return this.definitionOffset === 0 ? 0 : 1;
  },
  choices: {
    0: new Parser(),
    1: new Parser().pointer("definitions", {
      offset: function () {
        return this.definitionOffset - this.brresOffset;
      },
      type: new Parser()
        .saveOffset("brresOffset", { formatter: (item) => -item })
        .seek(4)
        .uint32("length")
        .seek(16)
        .array("entries", {
          length: "length",
          type: new Parser()
            .nest({ type: IndexGroupEntry })
            .pointer("entries", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: Definition,
            }),
        }),
      formatter: (item) => item.entries,
    }),
  },
});
