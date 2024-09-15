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

export const IndexGroupEntry = new Parser()
  .seek(8) // ignore id, left index and right index
  .nest("name", { type: OffsetString })
  .int32("offset");

export function paletteFormat(val) {
  switch (val) {
    case 0:
      return "IA8";
    case 1:
      return "RGB565";
    case 2:
      return "RGB5A3";
  }
}

export function blockHeight(format, height) {
  let blockHeight = 4;
  if (format === "I4" || format === "C4" || format === "CMPR") blockHeight = 8;
  return Math.ceil(height / blockHeight);
}

export function blockWidth(format, width) {
  let blockWidth = 8;
  if (
    format === "IA8" ||
    format === "RGB565" ||
    format === "RGB5A3" ||
    format === "RGBA32" ||
    format === "C14X2"
  )
    blockWidth = 4;
  return Math.ceil(width / blockWidth);
}

export function decodeIA8(val) {
  return [val & 0xff, val & 0xff, val & 0xff, (val >> 8) & 0xff];
}

export function decodeRGB565(val) {
  let r = ((val >> 11) & 0x1f) * 8;
  let g = ((val >> 5) & 0x3f) * 4;
  let b = (val & 0x1f) * 8;
  return [r, g, b, 255];
}

export function decodeRGB5A3(val) {
  if (val & 0x8000) {
    let r = Math.floor(((val >> 10) & 0x1f) * 8.25);
    let g = Math.floor(((val >> 5) & 0x1f) * 8.25);
    let b = Math.floor((val & 0x1f) * 8.25);
    return [r, g, b, 255];
  } else {
    let a = Math.floor(((val >> 12) & 0x7) * 36.5);
    let r = ((val >> 8) & 0xf) * 17;
    let g = ((val >> 4) & 0xf) * 17;
    let b = (val & 0xf) * 17;
    return [r, g, b, a];
  }
}

export function decodeBlock(format, block) {
  let data = [];
  if (format === "I8") {
    for (let val of block) {
      data.push(val, val, val, 255);
    }
  } else if (format === "RGB565") {
    for (let i = 0; i < block.length; i += 2) {
      let val = (block[i] << 8) | block[i + 1];
      decodeRGB565(val).forEach((v) => data.push(v));
    }
  }
  let result = [];
  let width = 32;
  if (
    format === "IA8" ||
    format === "RGB565" ||
    format === "RGB5A3" ||
    format === "RGBA32" ||
    format === "C14X2"
  )
    width = 16;
  while (data.length) result.push(data.splice(0, width));
  return result;
}

export function blockSize(format) {
  if (format === "RGBA32") return 64;
  return 32;
}

export function interleave(blocks, width, blockWidth) {
  let result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (j === blocks.length - 1 && blockWidth - width > 0) {
        result.push(blocks[j][i].slice(0, -4 * (blockWidth - width)));
      } else {
        result.push(blocks[j][i]);
      }
    }
  }
  return result;
}

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
