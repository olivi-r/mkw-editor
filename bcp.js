import { Parser } from "binary-parser";

export const BCP = new Parser()
  .endianness("big")
  .int32("magic", { assert: 0 })
  .uint16("last")
  .seek(2)
  .floatbe("bias")
  .array("scale", { length: 3, type: "floatbe" })
  .array("rotation", { length: 3, type: "floatbe" })
  .array("distance", { length: 3, type: "floatbe" })
  .array("position", {
    length: 16,
    type: new Parser().array("xyz", { length: 3, type: "floatbe" }),
    formatter: (item) => item.map((i) => i.xyz),
  })
  .array("speed", { length: 16, type: "floatbe" });
