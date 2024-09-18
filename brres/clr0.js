import { Parser } from "binary-parser";
import { IndexGroupEntry, OffsetString } from "../util.js";

const Color = new Parser()
  .uint8("red")
  .uint8("green")
  .uint8("blue")
  .uint8("alpha");

const ColorSequence = new Parser()
  .saveOffset("offsetBase")
  .int32("offset")
  .pointer("data", {
    offset: function () {
      return this.offset + this.offsetBase;
    },
    type: new Parser().array("colors", {
      length: function () {
        return this.$parent.$parent.$parent.$parent.$parent.$parent.frames;
      },
      type: Color,
    }),
  });

export const CLR0 = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "CLR0" })
  .seek(8)
  .int32("brresOffset")
  .int32("offset")
  .seek(4)
  .nest("name", { type: OffsetString })
  .seek(4)
  .uint16("frames")
  .uint16("materials")
  .uint32("loop")
  .pointer("animations", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser()
      .saveOffset("brresOffset", { formatter: (item) => -item })
      .seek(4) // ignore size
      .uint32("length")
      .seek(16)
      .array("entries", {
        length: "length",
        type: new Parser().nest({
          type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
            offset: function () {
              return this.offset - this.$parent.brresOffset;
            },
            type: new Parser()
              .saveOffset("brresOffset", { formatter: (item) => -item })
              .nest("name", { type: OffsetString })
              .nest("flags", {
                type: new Parser()
                  .bit10("unused")
                  .bit1("ConstantColorRegister3IsConst")
                  .bit1("hasConstantColorRegister3")
                  .bit1("ConstantColorRegister2IsConst")
                  .bit1("hasConstantColorRegister2")
                  .bit1("ConstantColorRegister1IsConst")
                  .bit1("hasConstantColorRegister1")
                  .bit1("ConstantColorRegister0IsConst")
                  .bit1("hasConstantColorRegister0")
                  .bit1("ColorRegister2IsConst")
                  .bit1("hasColorRegister2")
                  .bit1("ColorRegister1IsConst")
                  .bit1("hasColorRegister1")
                  .bit1("ColorRegister0IsConst")
                  .bit1("hasColorRegister0")
                  .bit1("LightChannel1AmbientIsConst")
                  .bit1("hasLightChannel1Ambient")
                  .bit1("LightChannel0AmbientIsConst")
                  .bit1("hasLightChannel0Ambient")
                  .bit1("LightChannel1MaterialIsConst")
                  .bit1("hasLightChannel1Material")
                  .bit1("LightChannel0MaterialIsConst")
                  .bit1("hasLightChannel0Material"),
              })
              .choice("LightChannel0Material", {
                tag: "flags.hasLightChannel0Material",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.LightChannel0MaterialIsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("LightChannel1Material", {
                tag: "flags.hasLightChannel1Material",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.LightChannel1MaterialIsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("LightChannel0Ambient", {
                tag: "flags.hasLightChannel0Ambient",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.LightChannel0AmbientIsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("LightChannel1Ambient", {
                tag: "flags.hasLightChannel1Ambient",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.LightChannel1AmbientIsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ColorRegister0", {
                tag: "flags.hasColorRegister0",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ColorRegister0IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ColorRegister1", {
                tag: "flags.hasColorRegister1",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ColorRegister1IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ColorRegister2", {
                tag: "flags.hasColorRegister2",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ColorRegister2IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ConstantColorRegister0", {
                tag: "flags.hasConstantColorRegister0",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ConstantColorRegister0IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ConstantColorRegister1", {
                tag: "flags.hasConstantColorRegister1",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ConstantColorRegister1IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ConstantColorRegister2", {
                tag: "flags.hasConstantColorRegister2",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ConstantColorRegister2IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              })
              .choice("ConstantColorRegister3", {
                tag: "flags.hasConstantColorRegister3",
                choices: {
                  0: new Parser(),
                  1: new Parser()
                    .nest("mask", {
                      type: Color,
                    })
                    .choice("data", {
                      tag: "$parent.flags.ConstantColorRegister3IsConst",
                      choices: {
                        0: ColorSequence,
                        1: Color,
                      },
                    }),
                },
              }),
          }),
          formatter: (item) => item.data,
        }),
      }),
    formatter: (item) => item.entries,
  });
