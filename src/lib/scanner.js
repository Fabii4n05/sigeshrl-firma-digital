export function parseScannedDni(raw) {
  const text = String(raw ?? "").trim();
  let candidate = "";
  if (/^\d{8}(?:\s*-\s*\d)?$/.test(text)) candidate = text.slice(0, 8);
  try {
    const data = JSON.parse(text);
    for (const key of ["dni", "numeroDocumento", "documentNumber"])
      if (/^\d{8}$/.test(String(data[key] ?? "")))
        candidate = String(data[key]);
  } catch {}
  const tagged = text.match(/(?:DNI|DOCUMENTO|CUI)\s*[=:|;]\s*(\d{8})(?!\d)/i);
  if (tagged) candidate = tagged[1];
  const mrz = text.toUpperCase().match(/I[<A-Z]PER(\d{8})/);
  if (mrz) candidate = mrz[1];
  try {
    const url = new URL(text);
    if (url.protocol === "https:")
      for (const key of ["dni", "documento", "numeroDocumento"])
        if (/^\d{8}$/.test(url.searchParams.get(key) ?? ""))
          candidate = url.searchParams.get(key);
  } catch {}
  return { dni: candidate, raw: text, needsReview: true };
}

export async function createBarcodeReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.PDF_417,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 200,
    delayBetweenScanSuccess: 600,
  });
}
