import { Parser } from "binary-parser";
import { IndexGroupEntry, OffsetString } from "../../util.js";

const ColorData = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("offset")
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("type")
  .uint32("format")
  .uint8("stride")
  .seek(1)
  .uint16("length")
  .pointer("entries", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("entries", {
      length: "$parent.length",
      type: new Parser().choice({
        tag: "$parent.$parent.format",
        choices: {
          0: new Parser().bit5("r").bit6("g").bit5("b"),
          1: new Parser().uint8("r").uint8("g").uint8("b"),
          2: new Parser().uint8("r").uint8("g").uint8("b").seek(4),
          3: new Parser().bit4("r").bit4("g").bit4("b").bit4("a"),
          4: new Parser().bit6("r").bit6("g").bit6("b").bit6("a"),
          5: new Parser().uint8("r").uint8("g").uint8("b").uint8("a"),
        },
      }),
    }),
    formatter: function (item) {
      return item.entries.map((i) =>
        this.format < 3 ? [i.r, i.g, i.b, 255] : [i.r, i.g, i.b, i.a]
      );
    },
  });

export const ColorSection = new Parser().choice({
  tag: function () {
    return this.colorOffset === 0 ? 0 : 1;
  },
  choices: {
    0: new Parser(),
    1: new Parser().pointer("colors", {
      offset: function () {
        return this.colorOffset - this.brresOffset;
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
            type: ColorData,
          }),
        }),
      formatter: (item) => item.entries.map((e) => e.data),
    }),
  },
});