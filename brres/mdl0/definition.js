import { Parser } from "binary-parser";
import { Section } from "../../util.js";

export const DefinitionSection = Section(
  "definitionOffset",
  "definitions",
  new Parser().nest({
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
      readUntil: (item) => item.code === 1,
      formatter: (item) => item.slice(0, -1),
    }),
    formatter: (item) => item.entries,
  }),
  (item) => item.entries
);
