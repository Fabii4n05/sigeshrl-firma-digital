export interface DniResult {
  dni: string;
  candidates: string[];
  name: string;
  raw: string;
  needsReview: boolean;
}
export function parseDni(raw: string): DniResult {
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const candidates: string[] = [];
  const add = (value: string) => {
    if (/^\d{8}$/.test(value) && !candidates.includes(value))
      candidates.push(value);
  };
  // El número impreso puede tener un dígito verificador separado; nunca se usa como parte del DNI.
  const labeled = normalized.matchAll(
    /(?:D\s*N\s*I(?:\s*E)?|NUMERO(?:\s+DE\s+DOCUMENTO)?|DOCUMENTO(?:\s+N[°ºO.]*)?|CUI)[^\d\n]{0,18}(\d[\d .-]{6,20}\d)/g,
  );
  for (const match of labeled) {
    const run = match[1].replace(/\D/g, "");
    if (run.length === 8 || run.length === 9) add(run.slice(0, 8));
  }
  // TD1 del documento peruano: el DNI sigue al código de país, sin asumir un formato de certificado.
  for (const match of normalized.matchAll(/I[<A-Z]PER(\d{8})/g)) add(match[1]);
  for (const match of normalized.matchAll(/(?<!\d)(\d{8})(?!\d)/g))
    add(match[1]);
  const nameLine = normalized.match(
    /(?:PRENOMBRES|NOMBRES)[ \t:]*\n?([A-Z][A-Z ]{2,70})/,
  );
  return {
    dni: candidates[0] ?? "",
    candidates,
    name: nameLine?.[1]?.trim() ?? "",
    raw,
    needsReview: true,
  };
}
