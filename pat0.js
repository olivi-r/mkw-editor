import { Parser } from "binary-parser";
import { IndexGroupEntry, OffsetString } from "./util.js";

const Offset = new Parser().nest({
  type: new Parser().uint32("offset"),
  formatter: (item) => item.offset - item.$parent.brresOffset,
});

const Keyframes = new Parser()
  .saveOffset("brresOffset", { formatter: (item) => -item })
  .nest("name", { type: OffsetString })
  .uint32("type")
  .int32("offset")
  .nest({
    type: new Parser().pointer("data", {
      offset: function () {
        return this.offset - this.brresOffset;
      },
      type: new Parser()
        .uint16("length")
        .seek(2)
        .floatbe("factor")
        .array("keyframes", {
          length: "length",
          type: new Parser()
            .floatbe("frame")
            .uint16("texture", {
              formatter: function (item) {
                return this.$parent.$parent.$parent.$parent.$parent.strings[
                  item
                ];
              },
            })
            .seek(2),
        }),
    }),
    formatter: function (item) {
      return item.data.keyframes;
    },
  });

export const PAT0 = new Parser()
  .useContextVars()
  .string("magic", { length: 4, assert: "PAT0" })
  .seek(4)
  .uint32("version")
  .int32("brresOffset")
  .array("offsets", {
    length: 6,
    type: Offset,
  })
  .nest("name", { type: OffsetString })
  .seek(4)
  .uint16("frames")
  .seek(2)
  .uint16("nStrings")
  .seek(4)
  .uint16("loop")
  .pointer("strings", {
    offset: "offsets[1]",
    type: new Parser()
      .saveOffset("brresOffset", { formatter: (item) => -item })
      .array("strings", {
        length: "$parent.nStrings",
        type: OffsetString,
      }),
    formatter: (item) => item.strings,
  })
  .pointer("animations", {
    offset: "offsets[0]",
    type: new Parser()
      .saveOffset("brresOffset", { formatter: (item) => -item })
      .seek(4)
      .uint32("length")
      .seek(16)
      .array("data", {
        length: function () {
          return this.length;
        },
        type: new Parser()
          .nest({ type: IndexGroupEntry })
          .pointer("keyframes", {
            offset: function () {
              return this.offset - this.$parent.brresOffset;
            },
            type: Keyframes,
          }),
      }),
    formatter: (item) => item.data,
  });
