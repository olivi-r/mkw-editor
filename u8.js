import { Parser } from "binary-parser";

export const U8 = new Parser()
  .useContextVars()
  .endianness("big")
  .saveOffset("baseOffset")
  .uint32("magic", { assert: 0x55aa382d })
  .uint32("rootOffset")
  .uint32("nodeStringSize")
  .uint32("fileDataOffset")
  .pointer("nodes", {
    offset: function () {
      return this.baseOffset + this.rootOffset;
    },
    type: new Parser()
      .nest("root", {
        type: new Parser()
          .uint8("isDir")
          .bit24("nameOffset")
          .uint32("parent")
          .uint32("sibling"),
      })
      .array("nodes", {
        length: function () {
          return this.root.sibling - 1;
        },
        type: new Parser()
          .uint8("isDir")
          .bit24("nameOffset")
          .pointer("name", {
            offset: function () {
              return (
                this.$parent.$parent.baseOffset +
                this.$parent.$parent.rootOffset +
                this.$parent.root.sibling * 12 +
                this.nameOffset
              );
            },
            type: new Parser().string("name", { zeroTerminated: true }),
            formatter: (item) => item.name,
          })
          .uint32("dataOffset")
          .uint32("dataSize")
          .choice({
            tag: "isDir",
            choices: {
              1: new Parser(),
              0: new Parser().pointer("data", {
                offset: function () {
                  return this.$parent.$parent.baseOffset + this.dataOffset;
                },
                type: new Parser().buffer("data", {
                  length: "$parent.dataSize",
                  clone: true,
                }),
                formatter: (item) => item.data,
              }),
            },
          }),
      }),
    formatter: (item) => item.nodes,
  });
