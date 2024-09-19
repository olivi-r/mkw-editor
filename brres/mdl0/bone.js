import { Parser } from "binary-parser";
import { IndexGroupEntry, OffsetString } from "../../util.js";

const Bones = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("matrixIndex")
  .nest("flags", {
    type: new Parser()
      .bit21("unused")
      .bit1("billboard")
      .bit1("geometry")
      .bit1("visible")
      .bit1("classic", { formatter: (item) => (item ? 0 : 1) })
      .bit1("parent")
      .bit1("apply")
      .bit1("uniform")
      .bit1("scale1")
      .bit1("rotation0")
      .bit1("translation0")
      .bit1("identity"),
  })
  .uint32("billboardSetting")
  .uint32("billboardRef")
  .array("scale", { length: 3, type: "floatbe" })
  .array("rotation", { length: 3, type: "floatbe" })
  .array("translation", { length: 3, type: "floatbe" })
  .array("min", { length: 3, type: "floatbe" })
  .array("max", { length: 3, type: "floatbe" })
  .int32("parent")
  .int32("firstChild")
  .int32("nextSibling")
  .int32("prevSibling")
  .seek(4)
  .array("absTrans", {
    length: 3,
    type: new Parser().array("row", { length: 4, type: "floatbe" }),
    formatter: (item) => item.map((i) => i.row).concat([[0, 0, 0, 1]]),
  })
  .array("absInvTrans", {
    length: 3,
    type: new Parser().array("row", { length: 4, type: "floatbe" }),
    formatter: (item) => item.map((i) => i.row).concat([[0, 0, 0, 1]]),
  });

export const BoneSection = new Parser().choice({
  tag: function () {
    return this.boneOffset === 0 ? 0 : 1;
  },
  choices: {
    0: new Parser(),
    1: new Parser().pointer("bones", {
      offset: function () {
        return this.boneOffset - this.brresOffset;
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
            type: Bones,
          }),
        }),
      formatter: (item) => item.entries.map((e) => e.data),
    }),
  },
});
