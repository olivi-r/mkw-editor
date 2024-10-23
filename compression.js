export function decompressLZ77(input) {
  let inputOffset = 8;
  let inputView = new DataView(input.buffer);

  let output = new Int8Array(inputView.getUint32(4, true) >> 8);

  let outputOffset = 0;
  let outputView = new DataView(output.buffer);

  while (true) {
    let flags = inputView.getUint8(inputOffset++);
    for (let i = 0; i < 8; i++) {
      if (outputOffset >= output.length) break;
      if ((flags & 0x80) === 0) {
        outputView.setInt8(outputOffset++, inputView.getUint8(inputOffset++));
      } else {
        let reference = inputView.getUint16(inputOffset);
        inputOffset += 2;
        let length = (reference >> 12) + 3;
        let offset = outputOffset - (reference & 0xfff) - 1;
        for (let j = 0; j < length; j++) {
          outputView.setInt8(outputOffset++, outputView.getInt8(offset++));
        }
      }
      flags <<= 1;
    }
    if (inputOffset >= input.length) break;
  }
  return output;
}

export function decompressYaz0(input) {
  let inputOffset = 16;
  let inputView = new DataView(input.buffer);

  let output = new Int8Array(inputView.getUint32(4));

  let outputOffset = 0;
  let outputView = new DataView(output.buffer);

  while (true) {
    let flags = inputView.getUint8(inputOffset++);
    for (let i = 0; i < 8; i++) {
      if (outputOffset >= output.length) break;
      if ((flags & 0x80) === 0x80) {
        outputView.setInt8(outputOffset++, inputView.getUint8(inputOffset++));
      } else {
        let ref0 = inputView.getUint16(inputOffset);
        inputOffset += 2;

        let address = outputOffset - (ref0 & 0xfff) - 1;
        let length = ref0 >> 12;

        if (length === 0) length = inputView.getUint8(inputOffset++) + 18;
        else length += 2;

        for (let j = 0; j < length; j++) {
          outputView.setInt8(outputOffset++, outputView.getInt8(address++));
        }
      }
      flags <<= 1;
    }
    if (inputOffset >= input.length) break;
  }
  return output;
}
