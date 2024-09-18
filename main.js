import { BRRES } from "./brres.js";
import { TEX0 } from "./brres/tex0.js";
import { decompress } from "yaz0";

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file != undefined) {
    const reader = new FileReader();
    reader.onload = async function (event) {
      let buffer = new Int8Array(event.target.result);
      let magic = new DataView(buffer.buffer).getUint32();

      // Check for Yaz0 compression
      if (magic === 0x59617a30) {
        // Yaz0
        buffer = await decompress(buffer);
        magic = new DataView(buffer.buffer).getUint32();
      }

      if (magic === 0x62726573) {
        // bres
        let file = BRRES.parse(buffer);
        console.log(file);

        for (let dir of file.directories) {
          if (dir.name !== "Textures(NW4R)") continue;
          for (let tex of dir.files) {
            // apply palette if applicable
            if (tex.usePalette === 1) {
              let palette;
              for (let dir of file.directories)
                if (dir.name === "Palettes(NW4R)")
                  for (let pal of dir.files)
                    if (pal.name === tex.name) palette = pal.colors;

              for (let i = 0; i < tex.mipmaps.length; i++) {
                for (let j = 0; j < tex.mipmaps[i].length; j++) {
                  let index = tex.mipmaps[i][j];
                  tex.mipmaps[i][j] = palette[index];
                }
                tex.mipmaps[i] = tex.mipmaps[i].flat();
              }
            }

            // render mipmaps
            for (let j = 0; j < tex.mipmaps.length; j++) {
              let canvas = document.createElement("canvas");
              let context = canvas.getContext("2d");

              canvas.width = tex.width >> j;
              canvas.height = tex.height >> j;
              let data = context.createImageData(canvas.width, canvas.height);
              data.data.set(tex.mipmaps[j]);
              context.putImageData(data, 0, 0);
              document.body.appendChild(canvas);
            }
          }
          break;
        }
      } else if (magic === 0x54455830) {
        // TEX0
        let file = TEX0.parse(buffer);
        console.log(file);

        // render mipmaps
        for (let i = 0; i < file.mipmaps.length; i++) {
          let canvas = document.createElement("canvas");
          let context = canvas.getContext("2d");

          canvas.width = file.width >> i;
          canvas.height = file.height >> i;
          let data = context.createImageData(canvas.width, canvas.height);
          data.data.set(file.mipmaps[i]);
          context.putImageData(data, 0, 0);
          document.body.appendChild(canvas);
        }
      } else {
        console.log(magic.toString(16));
      }
    };
    reader.readAsArrayBuffer(file);
  }
});
