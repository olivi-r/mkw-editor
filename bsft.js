import { Parser } from "binary-parser";

export const BSFT = new Parser()
  .useContextVars()
  .endianess("big")
  .saveOffset("baseOffset")
  .string("magic", { length: 4, assert: "bsft" })
  .uint32("length")
  .array("strings", {
    length: "length",
    type: new Parser().uint32("offset").pointer("string", {
      offset: function () {
        return this.$parent.baseOffset + this.offset;
      },
      type: new Parser().string("string", { zeroTerminated: true }),
    }),
    formatter: (item) => item.map((x) => x.string.string),
  });
