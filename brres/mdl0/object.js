import { Parser } from "binary-parser";
import { OffsetString, Section } from "../../util.js";

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

export const ObjectSection = Section(
  "objectOffset",
  "objects",
  new Parser()
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
    })
);
