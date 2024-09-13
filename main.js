import { BRRES } from "./brres.js";

const fileSelector = document.getElementById("file-selector");
fileSelector.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file != undefined) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const buffer = new Int8Array(event.target.result);
      console.log(BRRES.parse(buffer));
    };
    reader.readAsArrayBuffer(file);
  }
});
