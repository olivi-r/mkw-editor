import { Parser } from "binary-parser";
import {
  decodeIA8,
  decodeRGB565,
  decodeRGB5A3,
  OffsetString,
  paletteFormat,
} from "./util.js";

export const PLT0 = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "PLT0" })
  .seek(4) // skip size
  .uint32("version")
  .int32("brresOffset")
  .int32("offset")
  .nest("name", { type: OffsetString })
  .int32("format", { formatter: paletteFormat })
  .uint16("length")
  .pointer("colors", {
    type: new Parser().array("colors", {
      length: "$parent.length",
      type: new Parser().nest({
        type: new Parser().uint16("color"),
        formatter: function (item) {
          switch (this.$parent.$parent.format) {
            case "IA8":
              return decodeIA8(item.color);
            case "RGB565":
              return decodeRGB565(item.color);
            case "RGB5A3":
              return decodeRGB5A3(item.color);
          }
        },
      }),
    }),
    offset: function () {
      return this.offset - this.brresOffset;
    },
    formatter: function (item) {
      return item.colors;
    },
  });
