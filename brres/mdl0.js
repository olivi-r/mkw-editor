import { Parser } from "binary-parser";
import { BoneSection } from "./mdl0/bone.js";
import { ColorSection } from "./mdl0/color.js";
import { DefinitionSection } from "./mdl0/definition.js";
import { FurLayerSection } from "./mdl0/furlayer.js";
import { FurVectorSection } from "./mdl0/furvector.js";
import { PaletteLinkSection, TextureLinkSection } from "./mdl0/link.js";
import { MaterialSection } from "./mdl0/material.js";
import { NormalSection } from "./mdl0/normal.js";
import { ObjectSection } from "./mdl0/object.js";
import { TEVSection } from "./mdl0/tev.js";
import { OffsetString } from "../util.js";
import { UVSection } from "./mdl0/uv.js";
import { VerticesSection } from "./mdl0/vertices.js";

export const MDL0 = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "MDL0" })
  .seek(4)
  .uint32("version")
  .int32("brresOffset")
  .int32("definitionOffset")
  .nest({ type: DefinitionSection })
  .int32("boneOffset")
  .nest({ type: BoneSection })
  .int32("verticesOffset")
  .nest({ type: VerticesSection })
  .int32("normalOffset")
  .nest({ type: NormalSection })
  .int32("colorOffset")
  .nest({ type: ColorSection })
  .int32("uvOffset")
  .nest({ type: UVSection })
  .choice({
    tag: function () {
      return this.version >= 10 ? 1 : 0;
    },
    choices: {
      0: new Parser(),
      1: new Parser()
        .int32("furVectorOffset")
        .nest({ type: FurVectorSection })
        .int32("furLayerOffset")
        .nest({ type: FurLayerSection }),
    },
  })
  .int32("materialOffset")
  .nest({ type: MaterialSection })
  .int32("TEVOffset")
  .nest({ type: TEVSection })
  .int32("objectOffset")
  .nest({ type: ObjectSection })
  .int32("textureLinkOffset")
  .nest({ type: TextureLinkSection })
  .int32("paletteLinkOffset")
  .nest({ type: PaletteLinkSection })
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
  });
