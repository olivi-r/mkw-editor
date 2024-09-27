import { Parser } from "binary-parser";

export const THP = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "THP\0" })
  .uint32("version")
  .uint32("buf")
  .uint32("samples")
  .floatbe("fps")
  .uint32("numFrames")
  .uint32("size0")
  .uint32("size")
  .uint32("componentsOffset")
  .pointer("components", {
    offset: "componentsOffset",
    type: new Parser()
      .uint32("count")
      .array("types", {
        length: 16,
        type: "int8",
        formatter: (item) =>
          item.filter((x) => x >= 0).map((x) => ["video", "audio"][x]),
      })
      .choice({
        tag: function () {
          return this.types.includes("video") ? 1 : 0;
        },
        choices: {
          0: new Parser(),
          1: new Parser().nest("video", {
            type: new Parser()
              .uint32("width")
              .uint32("height")
              .choice({
                tag: function () {
                  return this.$parent.$parent.version >= 0x11000 ? 1 : 0;
                },
                choices: {
                  0: new Parser(),
                  1: new Parser().uint32("interlaced", {
                    formatter: (item) => ["no", "odd", "even"][item],
                  }),
                },
              }),
          }),
        },
      })
      .choice({
        tag: function () {
          return this.types.includes("audio") ? 1 : 0;
        },
        choices: {
          0: new Parser(),
          1: new Parser().nest("audio", {
            type: new Parser()
              .uint32("channels")
              .uint32("sampleRate")
              .uint32("samples")
              .choice({
                tag: function () {
                  return this.$parent.$parent.version >= 0x11000 ? 1 : 0;
                },
                choices: { 0: new Parser(), 1: new Parser().uint32("tracks") },
              }),
          }),
        },
      }),
  })
  .uint32("tableOffset")
  .uint32("firstOffset")
  .pointer("frames", {
    offset: "firstOffset",
    type: new Parser().array("frames", {
      length: "$parent.numFrames",
      type: new Parser()
        .saveOffset("startOffset")
        .uint32("nextSize")
        .uint32("prevSize")
        .array("sizes", {
          length: "$parent.$parent.components.count",
          type: "uint32be",
        })
        .array("components", {
          length: "$parent.$parent.components.count",
          type: new Parser().buffer("data", {
            length: function () {
              return this.$parent.sizes[this.$index];
            },
            clone: true,
            formatter: function (item) {
              if (
                this.$parent.$parent.$parent.components.types[this.$index] ===
                "video"
              ) {
                let start;
                let finish;
                let out = [];
                for (let i = 0; i < item.length - 1; i++) {
                  if (item[i] === -1 && item[i + 1] === -38) {
                    start = i + 2;
                    break;
                  }
                }
                for (let i = item.length - 2; i >= 0; i--) {
                  if (item[i] === -1 && item[i + 1] === -39) {
                    finish = i;
                    break;
                  }
                }
                for (let i = 0; i < item.length; i++) {
                  if (i < start || i >= finish) {
                    out.push(item[i]);
                  } else if (item[i] === -1) {
                    out.push(-1, 0);
                  } else {
                    out.push(item[i]);
                  }
                }
                return URL.createObjectURL(
                  new Blob([new Uint8Array(out).buffer], { type: "image/jpeg" })
                );
              }
              return item;
            },
          }),
        })
        .saveOffset("endOffset")
        .seek(function () {
          let diff = this.endOffset - this.startOffset;
          // console.log(Math.ceil(diff / 32) * 32 - diff);
          return Math.ceil(diff / 32) * 32 - diff;
        }),
    }),
  })
  .uint32("lastOffset");
