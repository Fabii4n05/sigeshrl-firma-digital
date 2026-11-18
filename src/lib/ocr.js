export async function createDniOCR(onProgress = () => {}) {
  const mod = await import("tesseract.js");
  const engine = mod.default ?? mod;
  const worker = await engine.createWorker("spa", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    workerBlobURL: false,
    gzip: true,
    logger: (m) => {
      if (m.status === "recognizing text")
        onProgress(Math.round(m.progress * 100));
    },
  });
  await worker.setParameters({ tessedit_pageseg_mode: engine.PSM.SPARSE_TEXT });
  return worker;
}
