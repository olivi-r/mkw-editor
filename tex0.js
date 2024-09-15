import { Parser } from "binary-parser";
import {
  blockHeight,
  blockSize,
  blockWidth,
  decodeBlock,
  imageFormat,
  interleave,
  OffsetString,
} from "./util.js";

const Block = new Parser().nest({
  type: new Parser().array("block", {
    length: function () {
      return blockSize(this.$parent.$parent.$parent.$parent.format);
    },
    type: "uint8",
  }),
  formatter: function (item) {
    return decodeBlock(
      this.$parent.$parent.$parent.$parent.$parent.format,
      item.block
    );
  },
});

const Row = new Parser().nest({
  type: new Parser().array("row", {
    length: function () {
      return blockWidth(
        this.$parent.$parent.$parent.$parent.format,
        this.$parent.$parent.$parent.$parent.width >> this.$parent.$index
      );
    },
    type: Block,
  }),
  formatter: function (item) {
    return interleave(item.row);
  },
});

const Mipmap = new Parser().nest({
  type: new Parser().array("blocks", {
    length: function () {
      return blockHeight(
        this.$parent.$parent.$parent.format,
        this.$parent.$parent.$parent.height >> this.$index
      );
    },
    type: Row,
  }),
  formatter: function (item) {
    return item.blocks.flat().flat();
  },
});

export const TEX0 = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "TEX0" })
  .seek(4) // skip size
  .uint32("version")
  .int32("brresOffset")
  .uint32("offset")
  .nest("name", { type: OffsetString })
  .uint32("usePalette")
  .uint16("width")
  .uint16("height")
  .uint32("format", { formatter: imageFormat })
  .uint32("mipmaps")
  .floatbe("min")
  .floatbe("max")
  .nest("mipmaps", {
    type: new Parser().pointer("data", {
      offset: function () {
        return this.$parent.offset - this.$parent.brresOffset;
      },
      type: new Parser().array("mipmaps", {
        length: function () {
          return this.$parent.$parent.max - this.$parent.$parent.min + 1;
        },
        type: Mipmap,
      }),
    }),
    formatter: function (item) {
      return item.data.mipmaps;
    },
  });
