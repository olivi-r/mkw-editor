import { Parser } from "binary-parser";
import { IndexGroupEntry, OffsetString } from "../util.js";

const Definition = new Parser().nest({
  type: new Parser().array("entries", {
    type: new Parser().uint8("code").choice({
      tag: "code",
      choices: {
        0: new Parser(),
        1: new Parser(),
        2: new Parser().uint16("boneIndex").uint16("parentMatrixIndex"),
        3: new Parser()
          .uint16("index")
          .uint8("length")
          .array("entries", {
            length: "length",
            type: new Parser().uint16("matrixIndex").floatbe("weight"),
          }),
        4: new Parser()
          .uint16("materialIndex")
          .uint16("objectIndex")
          .uint16("boneIndex")
          .uint8("priority"),
        5: new Parser().uint16("matrixIndex").uint16("boneIndex"),
      },
    }),
    readUntil: function (item, buffer) {
      return item.code === 1;
    },
    formatter: (item) => item.slice(0, -1),
  }),
  formatter: (item) => item.entries,
});

const Bones = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("matrixIndex")
  .nest("flags", {
    type: new Parser()
      .bit21("unused")
      .bit1("billboard")
      .bit1("geometry")
      .bit1("visible")
      .bit1("classic", { formatter: (item) => (item ? 0 : 1) })
      .bit1("parent")
      .bit1("apply")
      .bit1("uniform")
      .bit1("scale1")
      .bit1("rotation0")
      .bit1("translation0")
      .bit1("identity"),
  })
  .uint32("billboardSetting")
  .uint32("billboardRef")
  .array("scale", { length: 3, type: "floatbe" })
  .array("rotation", { length: 3, type: "floatbe" })
  .array("translation", { length: 3, type: "floatbe" })
  .array("min", { length: 3, type: "floatbe" })
  .array("max", { length: 3, type: "floatbe" })
  .int32("parent")
  .int32("firstChild")
  .int32("nextSibling")
  .int32("prevSibling")
  .seek(4)
  .array("absTrans", {
    length: 3,
    type: new Parser().array("row", { length: 4, type: "floatbe" }),
    formatter: (item) => item.map((i) => i.row).concat([[0, 0, 0, 1]]),
  })
  .array("absInvTrans", {
    length: 3,
    type: new Parser().array("row", { length: 4, type: "floatbe" }),
    formatter: (item) => item.map((i) => i.row).concat([[0, 0, 0, 1]]),
  });

const VerticesData = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("offset")
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("type")
  .uint32("format")
  .uint8("divisor")
  .uint8("stride")
  .uint16("length")
  .array("min", { length: 3, type: "floatbe" })
  .array("max", { length: 3, type: "floatbe" })
  .pointer("entries", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("entries", {
      length: "$parent.length",
      type: new Parser().choice({
        tag: "$parent.$parent.type",
        choices: {
          0: new Parser().array("data", {
            length: 2,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
          1: new Parser().array("data", {
            length: 3,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
        },
      }),
    }),
    formatter: function (item) {
      if (this.format === 4)
        return item.entries.map((i) => i.data.map((j) => j.value));

      return item.entries.map((i) =>
        i.data.map((j) => j.value / (1 << this.divisor))
      );
    },
  });

const NormalData = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("offset")
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("type")
  .uint32("format")
  .uint8("divisor")
  .uint8("stride")
  .uint16("length")
  .pointer("entries", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("entries", {
      length: "$parent.length",
      type: new Parser().choice({
        tag: function () {
          return this.$parent.$parent.type === 1 ? 1 : 0;
        },
        choices: {
          0: new Parser().array("data", {
            length: 3,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
          1: new Parser().array("data", {
            length: 9,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
        },
      }),
    }),
    formatter: function (item) {
      if (this.format === 4)
        return item.entries.map((i) => i.data.map((j) => j.value));

      return item.entries.map((i) =>
        i.data.map((j) => j.value / (1 << this.divisor))
      );
    },
  });

const ColorData = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("offset")
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("type")
  .uint32("format")
  .uint8("stride")
  .seek(1)
  .uint16("length")
  .pointer("entries", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("entries", {
      length: "$parent.length",
      type: new Parser().choice({
        tag: "$parent.$parent.format",
        choices: {
          0: new Parser().bit5("r").bit6("g").bit5("b"),
          1: new Parser().uint8("r").uint8("g").uint8("b"),
          2: new Parser().uint8("r").uint8("g").uint8("b").seek(4),
          3: new Parser().bit4("r").bit4("g").bit4("b").bit4("a"),
          4: new Parser().bit6("r").bit6("g").bit6("b").bit6("a"),
          5: new Parser().uint8("r").uint8("g").uint8("b").uint8("a"),
        },
      }),
    }),
    formatter: function (item) {
      return item.entries.map((i) =>
        this.format < 3 ? [i.r, i.g, i.b, 255] : [i.r, i.g, i.b, i.a]
      );
    },
  });

const UVData = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("offset")
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("type")
  .uint32("format")
  .uint8("divisor")
  .uint8("stride")
  .uint16("length")
  .array("min", { length: 2, type: "floatbe" })
  .array("max", { length: 2, type: "floatbe" })
  .pointer("entries", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("entries", {
      length: "$parent.length",
      type: new Parser().choice({
        tag: "$parent.$parent.type",
        choices: {
          0: new Parser().array("data", {
            length: 1,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
          1: new Parser().array("data", {
            length: 2,
            type: new Parser().choice({
              tag: "$parent.$parent.$parent.format",
              choices: {
                0: new Parser().uint8("value"),
                1: new Parser().int8("value"),
                2: new Parser().uint16("value"),
                3: new Parser().int16("value"),
                4: new Parser().floatbe("value"),
              },
            }),
          }),
        },
      }),
    }),
    formatter: function (item) {
      if (this.format === 4)
        return item.entries.map((i) => i.data.map((j) => j.value));

      return item.entries.map((i) =>
        i.data.map((j) => j.value / (1 << this.divisor))
      );
    },
  });

const PrimitiveDataGroup = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .uint32("buffer")
  .uint32("used")
  .int32("offset")
  .pointer("data", {
    offset: function () {
      return this.offset - this.brresOffset;
    },
    type: new Parser().array("data", {
      length: "$parent.buffer",
      type: "uint8",
    }),
    formatter: (item) => item.data,
  });

const Objects = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .seek(8)
  .int32("boneIndex")
  .uint32("CPvertex")
  .uint32("CPtexture")
  .uint32("XFvertex")
  .nest("vertexDefinition", { type: PrimitiveDataGroup })
  .nest("vertexPrimitives", { type: PrimitiveDataGroup })
  .nest("enableFlags", {
    type: new Parser()
      .bit11("unused")
      .bit1("UV7")
      .bit1("UV6")
      .bit1("UV5")
      .bit1("UV4")
      .bit1("UV3")
      .bit1("UV2")
      .bit1("UV1")
      .bit1("UV0")
      .bit1("color1")
      .bit1("color0")
      .bit1("normal")
      .bit1("position")
      .bit1("textureMatrix7")
      .bit1("textureMatrix6")
      .bit1("textureMatrix5")
      .bit1("textureMatrix4")
      .bit1("textureMatrix3")
      .bit1("textureMatrix2")
      .bit1("textureMatrix1")
      .bit1("textureMatrix0")
      .bit1("positionMatrix"),
  })
  .nest("shapeFlags", {
    type: new Parser().bit30("unused").bit1("invisible").bit1("changeMatrix"),
  })
  .nest("name", { type: OffsetString })
  .uint32("index")
  .uint32("numVertices")
  .uint32("numFaces")
  .int16("positionIndex")
  .int16("normalIndex")
  .array("colorIndices", {
    length: 2,
    type: new Parser().int16("index"),
    formatter: (item) => item.map((i) => i.index),
  })
  .array("uvIndices", {
    length: 8,
    type: new Parser().int16("index"),
    formatter: (item) => item.map((i) => i.index),
  })
  .choice({
    tag: function () {
      return this.$parent.$parent.$parent.version >= 10 ? 1 : 0;
    },
    choices: {
      0: new Parser(),
      1: new Parser().int16("furVectorIndex").int16("furLayerIndex"),
    },
  })
  .int32("usedMatrixIndicesOffset")
  .pointer("usedMatrixIndices", {
    offset: function () {
      return this.usedMatrixIndicesOffset - this.brresOffset;
    },
    type: new Parser()
      .uint32("length")
      .uint32("length")
      .array("indices", {
        length: "length",
        type: new Parser().uint16("index"),
      }),
    formatter: (item) => item.indices.map((i) => i.index),
  });

const TexturePaletteLink = new Parser().nest({
  type: new Parser()
    .saveOffset("brresOffset", { formatter: (item) => -item })
    .uint32("length")
    .array("entries", {
      length: "length",
      type: new Parser().int32("materialOffset").int32("textureOffset"),
    }),
  formatter: (item) => item.entries,
});

export const MDL0 = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "MDL0" })
  .seek(4)
  .uint32("version")
  .int32("brresOffset")
  .int32("definitionOffset")
  .int32("boneOffset")
  .int32("verticesOffset")
  .int32("normalOffset")
  .int32("colorOffset")
  .int32("uvOffset")
  .choice({
    tag: function () {
      return this.version >= 10 ? 1 : 0;
    },
    choices: {
      0: new Parser(),
      1: new Parser().int32("furVectorOffset").int32("furLayerOffset"),
    },
  })
  .int32("materialOffset")
  .int32("TEVOffset")
  .int32("objectOffset")
  .int32("textureLinkOffset")
  .int32("paletteLinkOffset")
  .choice({
    tag: function () {
      return this.version >= 11 ? 1 : 0;
    },
    choices: { 0: new Parser(), 1: new Parser().seek(4) },
  })
  .nest("name", { type: OffsetString })
  .seek(4)
  .int32("mdl0Offset")
  .uint32("scalingMode", {
    formatter: (item) => ["Standard", "Softimage", "Maya"][item],
  })
  .uint32("textureMatrixMode", {
    formatter: (item) => ["Maya", "XSI", "3dsMax"][item],
  })
  .uint32("numVertices")
  .uint32("numFaces")
  .seek(4)
  .uint32("numBones")
  .uint8("needNormalMatrixArray")
  .uint8("needTextureMatrixArray")
  .uint8("enableExtents")
  .uint8("envelopeMatrixMode", {
    formatter: (item) => ["Normal", "Approximate", "Exact"][item],
  })
  .int32("matrixToBoneTableOffset")
  .array("minCoords", { length: 3, type: "floatbe" })
  .array("maxCoords", { length: 3, type: "floatbe" })
  .pointer("matrixToBoneTable", {
    offset: function () {
      return this.matrixToBoneTableOffset - this.mdl0Offset - this.brresOffset;
    },
    type: new Parser().uint32("length").array("entries", {
      length: "length",
      type: new Parser().int32("index"),
    }),
  })
  .choice({
    tag: function () {
      return this.definitionOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("definitions", {
        offset: function () {
          return this.definitionOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser()
              .nest({ type: IndexGroupEntry })
              .pointer("entries", {
                offset: function () {
                  return this.offset - this.$parent.brresOffset;
                },
                type: Definition,
              }),
          }),
        formatter: (item) => item.entries,
      }),
    },
  })
  .choice({
    tag: function () {
      return this.boneOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("bones", {
        offset: function () {
          return this.boneOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: Bones,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.verticesOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("vertices", {
        offset: function () {
          return this.verticesOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: VerticesData,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.normalOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("normals", {
        offset: function () {
          return this.normalOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: NormalData,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.colorOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("colors", {
        offset: function () {
          return this.colorOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: ColorData,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.uvOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("uvs", {
        offset: function () {
          return this.uvOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: UVData,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.objectOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("objects", {
        offset: function () {
          return this.objectOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: Objects,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.textureLinkOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("textureLinks", {
        offset: function () {
          return this.textureLinkOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: TexturePaletteLink,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  })
  .choice({
    tag: function () {
      return this.paletteLinkOffset === 0 ? 0 : 1;
    },
    choices: {
      0: new Parser(),
      1: new Parser().pointer("paletteLinks", {
        offset: function () {
          return this.paletteLinkOffset - this.brresOffset;
        },
        type: new Parser()
          .saveOffset("brresOffset", { formatter: (item) => -item })
          .seek(4)
          .uint32("length")
          .seek(16)
          .array("entries", {
            length: "length",
            type: new Parser().nest({ type: IndexGroupEntry }).pointer("data", {
              offset: function () {
                return this.offset - this.$parent.brresOffset;
              },
              type: TexturePaletteLink,
            }),
          }),
        formatter: (item) => item.entries.map((e) => e.data),
      }),
    },
  });
