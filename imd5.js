import { Parser } from "binary-parser";

export const IMD5 = new Parser()
  .useContextVars()
  .endianess("big")
  .string("magic", { length: 4, assert: "IMD5" })
  .uint32("fileSize")
  .seek(8)
  .buffer("checksum", { length: 16 })
  .buffer("file", { length: "fileSize", clone: true });
