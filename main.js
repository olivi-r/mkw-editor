import { BRRES } from "./brres.js";
import { BRSTM } from "./brstm.js";
import { TEX0 } from "./brres/tex0.js";
import { clamp16 } from "./util.js";
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

      if (magic === 0x5253544d) {
        // RSTM
        let file = BRSTM.parse(buffer);
        console.log(file);

        let data = [];
        for (let i = 0; i < file.head.dataInfo.channels; i++) {
          let samples = [];
          for (let j = 0; j < file.head.dataInfo.blocks; j++) {
            let block = file.data.blocks[j][i];
            let blockSamples;

            if (j === file.head.dataInfo.blocks - 1)
              blockSamples = file.head.dataInfo.lastSamples;
            else blockSamples = file.head.dataInfo.blockSamples;

            if (file.head.dataInfo.encoding === "ADPCM") {
              let yn1 = file.adpc.history[j][i].yn1;
              let yn2 = file.adpc.history[j][i].yn2;

              let offset = 0;
              let scale;
              let coef1;
              let coef2;

              for (let k = 0; k < blockSamples; k++) {
                if (k % 14 === 0) {
                  let header = block[offset++];
                  let coefIdx = (header >> 4) << 1;
                  scale = 1 << (header & 0xf);
                  coef1 = file.head.channelInfo[i].coefficients[coefIdx];
                  coef2 = file.head.channelInfo[i].coefficients[coefIdx + 1];
                }

                let nibble;
                if ((k & 1) === 0) nibble = block[offset] >> 4;
                else nibble = block[offset++] & 0xf;
                nibble = nibble > 7 ? nibble - 16 : nibble;

                let sample = (nibble * scale) << 11;
                sample += coef1 * yn1 + coef2 * yn2;
                sample = clamp16((sample + 1024) >> 11);

                yn2 = yn1;
                yn1 = sample;
                samples.push(sample / 32768);
              }
            } else if (file.head.dataInfo.encoding === "PCM16") {
              for (let k = 0; k < blockSamples; k++) {
                let sample = block[k * 2 + 1];
                if (sample < 0) sample += 256;
                sample |= block[k * 2] << 8;
                samples.push(sample / 32768);
              }
            }
          }
          data.push(samples);
        }

        let audioCtx = new AudioContext();

        let audioBuf = audioCtx.createBuffer(
          file.head.dataInfo.channels,
          data[0].length,
          file.head.dataInfo.sampleRate
        );

        for (let i = 0; i < file.head.dataInfo.channels; i++) {
          audioBuf.copyToChannel(new Float32Array(data[i]), i);
        }

        let source = audioCtx.createBufferSource();
        source.buffer = audioBuf;
        source.connect(audioCtx.destination);
        source.start();
      } else if (magic === 0x62726573) {
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
