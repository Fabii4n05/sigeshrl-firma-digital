import { mkdir, readdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";
const dest = path.resolve("public/ocr");
await mkdir(dest, { recursive: true });
await copyFile(
  "node_modules/tesseract.js/dist/worker.min.js",
  path.join(dest, "worker.min.js"),
);
const coreDir = "node_modules/tesseract.js-core";
for (const file of await readdir(coreDir))
  if (/^tesseract-core-(simd-)?lstm\.wasm(\.js)?$/.test(file))
    await copyFile(path.join(coreDir, file), path.join(dest, file));
async function find(dir) {
  const files = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) files.push(...(await find(p)));
    else if (name === "spa.traineddata.gz") files.push(p);
  }
  return files;
}
const languages = await find("node_modules/@tesseract.js-data/spa");
const language = languages.find((p) => p.includes("best_int")) ?? languages[0];
if (!language) throw new Error("No se encontraron los datos OCR en español.");
await copyFile(language, path.join(dest, "spa.traineddata.gz"));
console.log("OCR preparado: motor y español disponibles localmente.");
