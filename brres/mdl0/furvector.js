import { Parser } from "binary-parser";
import { OffsetString, Section } from "../../util.js";

export const FurVectorSection = Section(
  "furVectorOffset",
  "furVectors",
  new Parser()
    .saveOffset("brresOffset", { formatter: (item) => -item })
    .seek(8)
    .int32("offset")
    .nest("name", { type: OffsetString })
    .uint32("index")
    .uint16("length")
    .pointer("entries", {
      offset: function () {
        return this.offset - this.brresOffset;
      },
      type: new Parser().array("entries", { length: 3, type: "floatbe" }),
      formatter: (item) => item.entries,
    })
);
