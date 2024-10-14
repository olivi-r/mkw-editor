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
  formatter: (item) => item.data.value,
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

function interpolate(col0, col1, fraction) {
  let r = Math.floor(col0[0] + (col1[0] - col0[0]) * fraction);
  let g = Math.floor(col0[1] + (col1[1] - col0[1]) * fraction);
  let b = Math.floor(col0[2] + (col1[2] - col0[2]) * fraction);
  return [r, g, b, 255];
}

export function decodeBlock(format, block) {
  let data = [];
  let width = 32;

  if (format === "I4") {
    for (let val of block)
      data.push(
        (val >> 4) * 17,
        (val >> 4) * 17,
        (val >> 4) * 17,
        255,
        (val & 0xf) * 17,
        (val & 0xf) * 17,
        (val & 0xf) * 17,
        255
      );
  } else if (format === "I8") {
    for (let val of block) data.push(val, val, val, 255);
  } else if (format === "IA4") {
    for (let val of block)
      data.push(
        (val & 0xf) * 17,
        (val & 0xf) * 17,
        (val & 0xf) * 17,
        (val >> 4) * 17
      );
  } else if (format === "IA8") {
    width = 16;
    for (let i = 0; i < 32; i += 2)
      decodeIA8((block[i] << 8) | block[i + 1]).forEach((v) => data.push(v));
  } else if (format === "RGB565") {
    width = 16;
    for (let i = 0; i < 32; i += 2)
      decodeRGB565((block[i] << 8) | block[i + 1]).forEach((v) => data.push(v));
  } else if (format === "RGB5A3") {
    width = 16;
    for (let i = 0; i < 32; i += 2)
      decodeRGB5A3((block[i] << 8) | block[i + 1]).forEach((v) => data.push(v));
  } else if (format === "RGBA32") {
    width = 16;
    for (let i = 0; i < 32; i += 2) {
      data.push(block[i + 1], block[i + 32], block[i + 33], block[i]);
    }
  } else if (format === "C4") {
    width = 8;
    for (let val of block) data.push(val >> 4, val & 0xf);
  } else if (format === "C8") {
    width = 8;
    data = block;
  } else if (format === "C14X2") {
    width = 4;
    for (let i = 0; i < 32; i += 2)
      data.push(((block[i] & 0x3f) << 8) | block[i + 1]);
  } else if (format === "CMPR") {
    let chunks = [[], []];
    for (let i = 0; i < 32; i += 8) {
      let val0 = (block[i] << 8) | block[i + 1];
      let val1 = (block[i + 2] << 8) | block[i + 3];
      let palette = [decodeRGB565(val0), decodeRGB565(val1)];
      if (val0 > val1) {
        palette.push(interpolate(palette[0], palette[1], 1 / 3));
        palette.push(interpolate(palette[0], palette[1], 2 / 3));
      } else {
        palette.push(interpolate(palette[0], palette[1], 1 / 2));
        palette.push([0, 0, 0, 0]);
      }

      let chunk = [[], [], [], []];
      for (let j = 0; j < 4; j++) {
        chunk[j].push(palette[block[i + 4 + j] >> 6]);
        chunk[j].push(palette[(block[i + 4 + j] >> 4) & 0x3]);
        chunk[j].push(palette[(block[i + 4 + j] >> 2) & 0x3]);
        chunk[j].push(palette[block[i + 4 + j] & 0x3]);
      }

      chunks[i >> 4].push(chunk);
    }
    interleave(chunks[0], 0, 0)
      .flat()
      .flat()
      .forEach((v) => data.push(v));
    interleave(chunks[1], 0, 0)
      .flat()
      .flat()
      .forEach((v) => data.push(v));
  }
  let result = [];
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

export function Section(offsetName, sectionName, subsection, formatter) {
  if (formatter === undefined) {
    formatter = (item) => item.entries.map((e) => e.data);
  }

  return new Parser().choice({
    tag: function () {
      return this[offsetName] === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer(sectionName, {
        offset: function () {
          return this[offsetName] - this.brresOffset;
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
              type: subsection,
            }),
          }),
        formatter: formatter,
      }),
    },
  });
}

export function clamp16(x) {
  return Math.min(Math.max(x, -32768), 32767);
}

export function audioBufferToWav(buffer) {
  let data = new Uint8Array(44 + buffer.length * buffer.numberOfChannels * 2);
  let view = new DataView(data.buffer);
  view.setUint32(0, 0x52494646); // "RIFF"
  view.setUint32(4, buffer.length * buffer.numberOfChannels * 2 + 36, true);
  view.setUint32(8, 0x57415645); // "WAVE"
  view.setUint32(12, 0x666d7420); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, buffer.numberOfChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
  view.setUint16(32, buffer.numberOfChannels * 2, true);
  view.setUint16(34, 16, true); // PCM16
  view.setUint32(36, 0x64617461); // "data"
  view.setUint32(40, buffer.length * buffer.numberOfChannels * 2, true);
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < buffer.numberOfChannels; j++) {
      let sample = buffer.getChannelData(j)[i];
      view.setInt16(
        44 + i * buffer.numberOfChannels * 2 + j * 2,
        sample * 32768,
        true
      );
    }
  }
  return data;
}
