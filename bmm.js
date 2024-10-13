import { Parser } from "binary-parser";

export const BMM = new Parser()
  .array("color", { length: 4, type: "uint8" })
  .floatbe("scaleS")
  .floatbe("transS")
  .floatbe("scaleT")
  .floatbe("transT");
