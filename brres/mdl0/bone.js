import { Parser } from "binary-parser";
import { OffsetString, Section } from "../../util.js";

export const BoneSection = Section(
  "boneOffset",
  "bones",
  new Parser()
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
    })
);
