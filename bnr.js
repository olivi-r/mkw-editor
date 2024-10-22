import { Parser } from "binary-parser";
import { decodeBlock, interleave } from "./util.js";

const String = function (encoding) {
  return new Parser()
    .string("title", { length: 32, encoding: encoding, stripNull: true })
    .string("author", { length: 32, encoding: encoding, stripNull: true })
    .string("longTitle", {
      length: 64,
      encoding: encoding,
      stripNull: true,
    })
    .string("longAuthor", {
      length: 64,
      encoding: encoding,
      stripNull: true,
    })
    .string("description", {
      length: 128,
      encoding: encoding,
      stripNull: true,
    });
};

const Block = new Parser().nest({
  type: new Parser().array("block", { length: 32, type: "uint8" }),
  formatter: function (item) {
    return decodeBlock("RGB5A3", item.block);
  },
});

const BannerImage = new Parser().nest({
  type: new Parser().array("rows", {
    length: 8,
    type: new Parser().array("row", {
      length: 24,
      type: Block,
      formatter: (item) => interleave(item, 96, 96),
    }),
  }),
  formatter: (item) => item.rows.map((row) => row.row.flat()).flat(),
});

export const BNR1 = new Parser()
  .string("magic", { length: 4, assert: "BNR1" })
  .seek(28)
  .nest("image", { type: BannerImage })
  .nest("details", { type: String("shift-jis") });

export const BNR2 = new Parser()
  .string("magic", { length: 4, assert: "BNR2" })
  .seek(28)
  .nest("image", { type: BannerImage })
  .nest("details", {
    type: new Parser()
      .nest("en", { type: String("windows-1252") })
      .nest("de", { type: String("windows-1252") })
      .nest("fr", { type: String("windows-1252") })
      .nest("es", { type: String("windows-1252") })
      .nest("it", { type: String("windows-1252") })
      .nest("nl", { type: String("windows-1252") }),
  });
