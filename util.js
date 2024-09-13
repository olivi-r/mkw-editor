import { Parser } from "binary-parser";

export const OffsetString = new Parser().nest({
  type: new Parser().int32("offset").pointer("data", {
    offset: function () {
      if (this.$parent.brresOffset !== undefined)
        return this.offset - this.$parent.brresOffset - 4;
      return this.offset - this.$parent.$parent.brresOffset - 4;
    },
    type: new Parser().uint32("length").string("value", { length: "length" }),
  }),
  formatter: function (item) {
    return item.data.value;
  },
});

export function imageFormat(val) {
  switch (val) {
    case 0:
      return "I4";
    case 1:
      return "I8";
    case 2:
      return "IA4";
    case 3:
      return "IA8";
    case 4:
      return "RGB565";
    case 5:
      return "RGB5A3";
    case 6:
      return "RGBA32";
    case 8:
      return "C4";
    case 9:
      return "C8";
    case 10:
      return "C14X2";
    case 14:
      return "CMPR";
  }
}

export function blockSize(format) {
  if (format === "RGBA32") return 64;
  return 32;
}

export function blockCount(format, width, height) {
  let blockHeight = 4;
  let blockWidth = 4;
  if (format === "I8" || format === "IA4" || format === "C8") blockWidth = 8;
  if (format === "I4" || format === "C4" || format === "CMPR") {
    blockHeight = 8;
    blockWidth = 8;
  }
  return Math.ceil(width / blockWidth) * Math.ceil(height / blockHeight);
}
