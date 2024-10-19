import { Parser } from "binary-parser";

export const RARC = new Parser()
  .useContextVars()
  .endianness("big")
  .string("magic", { length: 4, assert: "RARC" })
  .uint32("fileSize")
  .uint32("headerSize")
  .uint32("dataOffset")
  .uint32("dataSize")
  .uint32("mramPreload")
  .uint32("aramPreload")
  .seek(4)
  .saveOffset("baseOffset")
  .uint32("numDirectories")
  .uint32("dir0Offset")
  .uint32("numNodes")
  .uint32("node0Offset")
  .uint32("stringTableSize")
  .uint32("stringTableOffset")
  .uint16("nextNode")
  .uint16("indexID")
  .pointer("directories", {
    offset: function () {
      return this.dir0Offset + this.baseOffset;
    },
    type: new Parser().array("directories", {
      length: "$root.numDirectories",
      type: new Parser()
        .string("ident", { length: 4 })
        .uint32("nameOffset")
        .pointer("name", {
          offset: function () {
            return (
              this.$root.baseOffset +
              this.$root.stringTableOffset +
              this.nameOffset
            );
          },
          type: new Parser().string("name", { zeroTerminated: true }),
          formatter: (item) => item.name,
        })
        .uint16("hash")
        .uint16("numChildren")
        .uint32("firstChild"),
    }),
    formatter: (item) => item.directories,
  })
  .pointer("nodes", {
    offset: function () {
      return this.node0Offset + this.baseOffset;
    },
    type: new Parser().array("nodes", {
      length: "$root.numNodes",
      type: new Parser()
        .int16("id")
        .uint16("hash")
        .bit1("compression", { formatter: (item) => ["Yay0", "Yaz0"][item] })
        .bit1("loadDVD")
        .bit1("loadARAM")
        .bit1("laodMRAM")
        .bit1("unused")
        .bit1("isCompressed")
        .bit1("isDir")
        .bit1("isFile")
        .bit24("nameOffset")
        .pointer("name", {
          offset: function () {
            return (
              this.$root.baseOffset +
              this.$root.stringTableOffset +
              this.nameOffset
            );
          },
          type: new Parser().string("name", { zeroTerminated: true }),
          formatter: (item) => item.name,
        })
        .uint32("dataOffset")
        .uint32("dataSize")
        .choice({
          tag: "isFile",
          choices: {
            0: new Parser(),
            1: new Parser().pointer("data", {
              offset: function () {
                return this.$root.dataOffset + this.dataOffset;
              },
              type: new Parser().buffer("data", {
                length: "$parent.dataSize",
                clone: true,
              }),
              formatter: (item) => item.data,
            }),
          },
        })
        .seek(4),
    }),
    formatter: (item) => item.nodes,
  });
