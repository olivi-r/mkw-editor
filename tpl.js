import { Parser } from "binary-parser";
import {
  blockHeight,
  blockSize,
  blockWidth,
  decodeBlock,
  imageFormat,
  interleave,
} from "./util.js";

const wrap = (item) => ["clamp", "repeat", "mirror"][item];
const filter = (item) =>
  [
    "nearest",
    "linear",
    "nearest_mipmap_nearest",
    "linear_mipmap_nearest",
    "nearest_mipmap_linear",
    "linear_mipmap_linear",
  ][item];

const Block = new Parser().nest({
  type: new Parser().array("block", {
    length: function () {
      return blockSize(this.$parent.$parent.$parent.$parent.format);
    },
    type: "uint8",
  }),
  formatter: function (item) {
    return decodeBlock(this.$parent.$parent.$parent.$parent.format, item.block);
  },
});

const Row = new Parser().nest({
  type: new Parser().array("row", {
    length: function () {
      return blockWidth(
        this.$parent.$parent.$parent.format,
        this.$parent.$parent.$parent.width >> this.$parent.$index
      );
    },
    type: Block,
  }),
  formatter: function (item) {
    let width = this.$parent.$parent.$parent.width >> this.$parent.$index;
    let height = this.$parent.$parent.$parent.height >> this.$parent.$index;
    let format = this.$parent.$parent.$parent.format;

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
      return blockHeight(
        this.$parent.$parent.format,
        this.$parent.$parent.height >> this.$index
      );
    },
    type: Row,
  }),
  formatter: function (item) {
    return item.blocks.flat().flat();
  },
});

export const TPL = new Parser()
  .useContextVars()
  .endianess("big")
  .uint32("magic", { assert: 0x20af30 })
  .uint32("numImages")
  .uint32("tableOffset")
  .pointer("images", {
    offset: "tableOffset",
    type: new Parser().array("images", {
      length: "$parent.numImages",
      type: new Parser()
        .uint32("imageOffset")
        .uint32("paletteOffset")
        .pointer("image", {
          offset: "imageOffset",
          type: new Parser()
            .uint16("height")
            .uint16("width")
            .uint32("format", { formatter: imageFormat })
            .uint32("offset")
            .uint32("wrapS", { formatter: wrap })
            .uint32("wrapT", { formatter: wrap })
            .floatbe("bias")
            .uint8("edgeLod")
            .uint8("minLod")
            .uint8("maxLod")
            .uint32("minFilter", { formatter: filter })
            .uint32("magFilter", { formatter: filter })
            .uint8("unpacked")
            .pointer("mipmaps", {
              offset: "offset",
              type: new Parser().array("mipmaps", {
                length: function () {
                  return this.$parent.maxLod - this.$parent.minLod + 1;
                },
                type: Mipmap,
              }),
              formatter: (item) => item.mipmaps,
            }),
        }),
    }),
    formatter: (item) => item.images.map((x) => x.image),
  });
