import { Parser } from "binary-parser";
import {
  blockHeight,
  blockSize,
  blockWidth,
  decodeBlock,
  imageFormat,
  interleave,
} from "./util.js";

const Block = new Parser().nest({
  type: new Parser().array("block", {
    length: function () {
      return blockSize(this.$root.format);
    },
    type: "uint8",
  }),
  formatter: function (item) {
    return decodeBlock(this.$root.format, item.block);
  },
});

const Row = new Parser().nest({
  type: new Parser().array("row", {
    length: function () {
      return blockWidth(
        this.$root.format,
        this.$root.width >> this.$parent.$index
      );
    },
    type: Block,
  }),
  formatter: function (item) {
    let width = this.$root.width >> this.$parent.$index;
    let height = this.$root.height >> this.$parent.$index;
    let format = this.$root.format;

    let bWidth = 4;
    let bHeight = 4;
    if (format === "I4" || format === "C4" || format === "CMPR") {
      bWidth = 8;
      bHeight = 8;
    } else if (format === "I8" || format === "IA4" || format === "C8")
      bWidth = 8;

    // interleave rows whilst trimming edge blocks to image size
    if (
      this.$index === blockHeight(format, height) - 1 &&
      blockHeight(format, height) * bHeight - height > 0
    ) {
      let row = [];
      for (let i = 0; i < item.row.length; i++)
        row.push(
          item.row[i].slice(0, height - blockHeight(format, height) * bHeight)
        );
      return interleave(row, width, blockWidth(format, width) * bWidth);
    }
    return interleave(item.row, width, blockWidth(format, width) * bWidth);
  },
});

const Mipmap = new Parser().nest({
  type: new Parser().array("blocks", {
    length: function () {
      return blockHeight(this.$root.format, this.$root.height >> this.$index);
    },
    type: Row,
  }),
  formatter: function (item) {
    return item.blocks.flat().flat();
  },
});

export const BTI = new Parser()
  .useContextVars()
  .endianess("big")
  .uint8("format", { formatter: imageFormat })
  .uint8("enableAlpha")
  .uint16("width")
  .uint16("height")
  .uint8("wrapS")
  .uint8("wrapT")
  .uint8("hasPalette")
  .uint8("paletteFormat")
  .uint16("paletteLength")
  .uint32("paletteOffset")
  .uint8("enableMipmaps")
  .uint8("enableEdgeLOD")
  .uint8("clampBias")
  .uint8("maxAnisotropy")
  .uint8("minFilter")
  .uint8("magFilter")
  .uint8("minLOD")
  .uint8("maxLOD")
  .uint8("numImages")
  .seek(1)
  .int16("LODBias")
  .uint32("dataOffset")
  .pointer("mipmaps", {
    offset: "dataOffset",
    type: new Parser().array("mipmaps", {
      length: "$root.numImages",
      type: Mipmap,
    }),
    formatter: (item) => item.mipmaps,
  });
