import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createWorker, PSM } from "tesseract.js";
import { parseDni } from "../src/dni";
test("El motor OCR real reconoce el número de la muestra ficticia", async () => {
  const worker = await createWorker("spa", 1, {
    langPath: path.resolve("public/ocr"),
    cacheMethod: "none",
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const result = await worker.recognize("public/dni-ejemplo.png");
    assert.equal(parseDni(result.data.text).dni, "00000014");
  } finally {
    await worker.terminate();
  }
});
