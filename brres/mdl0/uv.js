import { Parser } from "binary-parser";
import { IndexGroupEntry, OffsetString } from "../../util.js";

const UVData = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("offset")
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("type")
  .uint32("format")
  .uint8("divisor")
  .uint8("stride")
  .uint16("length")
  .array("min", { length: 2, type: "floatbe" })
  .array("max", { length: 2, type: "floatbe" })
  .pointer("entries", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("entries", {
      length: "$parent.length",
      type: new Parser().choice({
        tag: "$parent.$parent.type",
        choices: {
          0: new Parser().array("data", {
            length: 1,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
          1: new Parser().array("data", {
            length: 2,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
        },
      }),
    }),
    formatter: function (item) {
      if (this.format === 4)
        return item.entries.map((i) => i.data.map((j) => j.value));

      return item.entries.map((i) =>
        i.data.map((j) => j.value / (1 << this.divisor))
      );
    },
  });

export const UVSection = new Parser().choice({
  tag: function () {
    return this.uvOffset === 0 ? 0 : 1;
  },
  choices: {
    0: new Parser(),
    1: new Parser().pointer("uvs", {
      offset: function () {
        return this.uvOffset - this.brresOffset;
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
            type: UVData,
          }),
        }),
      formatter: (item) => item.entries.map((e) => e.data),
    }),
  },
});
