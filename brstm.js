import { Parser } from "binary-parser";

const Reference = new Parser()
  .uint8("refType")
  .uint8("dataType")
  .seek(2)
  .uint32("offset");

const _BRSTM = new Parser()
  .uint16("version")
  .uint32("size")
  .uint16("headerSize")
  .uint16("sectionCount")
  .uint32("headOffset")
  .uint32("headSize")
  .pointer("head", {
    offset: "headOffset",
    type: new Parser()
      .string("magic", { length: 4, assert: "HEAD" })
      .uint32("size")
      .saveOffset("baseOffset")
      .nest("dataInfo", {
        type: new Parser().nest({ type: Reference }).pointer("data", {
          offset: function () {
            if (this.refType === 0) return this.offset;
            return this.$parent.baseOffset + this.offset;
          },
          type: new Parser()
            .uint8("encoding", {
              formatter: (item) => ["PCM8", "PCM16", "ADPCM"][item],
            })
            .uint8("loop")
            .uint8("channels")
            .bit24("sampleRate")
            .uint16("blockHeader")
            .uint32("loopStart")
            .uint32("loopEnd")
            .uint32("offset")
            .uint32("blocks")
            .uint32("blockSize")
            .uint32("blockSamples")
            .uint32("lastSize")
            .uint32("lastSamples")
            .uint32("lastSizePadded")
            .uint32("adpcmInterval")
            .uint32("adpcmSize"),
        }),
        formatter: (item) => item.data,
      })
      .nest("trackInfo", {
        type: new Parser().nest({ type: Reference }).pointer("data", {
          offset: function () {
            if (this.refType === 0) return this.offset;
            return this.$parent.baseOffset + this.offset;
          },
          type: new Parser()
            .uint8("length")
            .uint8("type")
            .seek(2)
            .array("infos", {
              length: "length",
              type: new Parser().nest({ type: Reference }).pointer("data", {
                offset: function () {
                  if (this.refType === 0) return this.offset;
                  return this.$parent.$parent.$parent.baseOffset + this.offset;
                },
                type: new Parser().choice({
                  tag: "$parent.$parent.type",
                  choices: {
                    0: new Parser()
                      .uint8("length")
                      .array("table", { length: "length", type: "uint8" }),
                    1: new Parser()
                      .uint8("volume")
                      .uint8("pan")
                      .seek(6)
                      .uint8("length")
                      .array("table", { length: "length", type: "uint8" }),
                  },
                }),
              }),
            }),
        }),
        formatter: (item) => item.data.infos.map((x) => x.data),
      })
      .nest("channelInfo", {
        type: new Parser().nest({ type: Reference }).pointer("data", {
          offset: function () {
            if (this.refType === 0) return this.offset;
            return this.$parent.baseOffset + this.offset;
          },
          type: new Parser()
            .uint8("length")
            .seek(3)
            .array("infos", {
              length: "length",
              type: new Parser().nest({ type: Reference }).pointer("data", {
                offset: function () {
                  if (this.refType === 0) return this.offset;
                  return this.$parent.$parent.$parent.baseOffset + this.offset;
                },
                type: new Parser()
                  .saveOffset("offset")
                  .seek(8)
                  .array("coefficients", {
                    length: 16,
                    type: new Parser().int16("coef"),
                    formatter: (item) => item.map((x) => x.coef),
                  })
                  .uint16("gain")
                  .uint16("pred")
                  .int16("yn1")
                  .int16("yn2")
                  .uint16("loopPred")
                  .int16("loopYn1")
                  .int16("loopYn2"),
              }),
            }),
        }),
        formatter: (item) => item.data.infos.map((x) => x.data),
      }),
  })
  .uint32("adpcOffset")
  .uint32("adpcSize")
  .choice({
    tag: function () {
      return this.adpcOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("adpc", {
        offset: "adpcOffset",
        type: new Parser()
          .string("magic", { length: 4, assert: "ADPC" })
          .uint32("size")
          .array("history", {
            length: "$root.head.dataInfo.blocks",
            type: new Parser().array("data", {
              length: "$root.head.dataInfo.channels",
              type: new Parser().int16("yn1").int16("yn2"),
            }),
            formatter: (item) => item.map((x) => x.data),
          }),
      }),
    },
  })
  .uint32("dataOffset")
  .uint32("dataSize")
  .pointer("data", {
    offset: "dataOffset",
    type: new Parser()
      .string("magic", { length: 4, assert: "DATA" })
      .uint32("size")
      .saveOffset("baseOffset")
      .uint32("offset")
      .pointer("blocks", {
        offset: function () {
          return this.baseOffset + this.offset;
        },
        type: new Parser().array("blocks", {
          length: "$root.head.dataInfo.blocks",
          type: new Parser().array("channels", {
            length: "$root.head.dataInfo.channels",
            type: new Parser().buffer("data", {
              length: function () {
                if (this.$parent.$index < this.$root.head.dataInfo.blocks - 1)
                  return this.$root.head.dataInfo.blockSize;
                return this.$root.head.dataInfo.lastSizePadded;
              },
            }),
          }),
        }),
        formatter: (item) =>
          item.blocks.map((x) => x.channels.map((y) => y.data)),
      }),
  });

export const BRSTM = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "RSTM" })
  .uint16be("bom")
  .choice({
    tag: "bom",
    choices: {
      0xfeff: new Parser().endianness("big").nest({ type: _BRSTM }),
      0xfffe: new Parser().endianness("little").nest({ type: _BRSTM }),
    },
  });
