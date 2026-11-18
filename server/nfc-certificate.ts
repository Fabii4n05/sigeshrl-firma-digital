const decoder = new TextDecoder();
type Node = { tag: number; start: number; value: number; end: number };
function node(bytes: Uint8Array, start: number): Node {
  if (start + 2 > bytes.length) throw new Error("Certificado incompleto.");
  const tag = bytes[start];
  let offset = start + 1,
    length = bytes[offset++];
  if (length & 128) {
    const count = length & 127;
    if (!count || count > 4 || offset + count > bytes.length)
      throw new Error("Longitud DER no válida.");
    length = 0;
    for (let i = 0; i < count; i++) length = length * 256 + bytes[offset++];
  }
  if (offset + length > bytes.length)
    throw new Error("Certificado incompleto.");
  return { tag, start, value: offset, end: offset + length };
}
function children(bytes: Uint8Array, parent: Node) {
  const list: Node[] = [];
  for (let i = parent.value; i < parent.end; ) {
    const child = node(bytes, i);
    if (child.end > parent.end || list.length > 200)
      throw new Error("Estructura DER no válida.");
    list.push(child);
    i = child.end;
  }
  return list;
}
function string(bytes: Uint8Array, n: Node) {
  if (n.tag === 30) {
    let text = "";
    for (let i = n.value; i + 1 < n.end; i += 2)
      text += String.fromCharCode(bytes[i] * 256 + bytes[i + 1]);
    return text;
  }
  return decoder.decode(bytes.slice(n.value, n.end));
}
function name(bytes: Uint8Array, n: Node) {
  const fields: Record<string, string> = {};
  for (const set of children(bytes, n))
    for (const sequence of children(bytes, set)) {
      const [oid, value] = children(bytes, sequence);
      if (!oid || !value) continue;
      const key = Array.from(bytes.slice(oid.value, oid.end))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      fields[key] = string(bytes, value);
    }
  return fields;
}
function date(bytes: Uint8Array, n: Node) {
  const raw = string(bytes, n);
  let year = raw.slice(0, n.tag === 23 ? 2 : 4),
    rest = raw.slice(n.tag === 23 ? 2 : 4);
  if (n.tag === 23) year = (Number(year) >= 50 ? "19" : "20") + year;
  const result = new Date(
    `${year}-${rest.slice(0, 2)}-${rest.slice(2, 4)}T${rest.slice(4, 6)}:${rest.slice(6, 8)}:${rest.slice(8, 10)}Z`,
  );
  if (Number.isNaN(result.getTime()))
    throw new Error("Vigencia del certificado no reconocida.");
  return result;
}
export function certificateInfo(bytes: Uint8Array) {
  if (bytes.length > 16384) throw new Error("Certificado demasiado grande.");
  const root = node(bytes, 0);
  if (root.tag !== 48 || root.end !== bytes.length)
    throw new Error("El certificado no es DER válido.");
  const [tbs] = children(bytes, root);
  const fields = children(bytes, tbs);
  const i = fields[0].tag === 160 ? 1 : 0;
  const issuer = name(bytes, fields[i + 2]),
    validity = children(bytes, fields[i + 3]),
    subject = name(bytes, fields[i + 4]),
    key = fields[i + 5];
  const serial = subject["550405"] ?? "";
  const dni = serial.match(/PNOPE-(\d{8})(?!\d)/)?.[1] ?? "";
  return {
    dni,
    subject: subject["550403"] ?? Object.values(subject).join(", "),
    issuer: issuer["550403"] ?? Object.values(issuer).join(", "),
    notBefore: date(bytes, validity[0]),
    notAfter: date(bytes, validity[1]),
    spki: bytes.slice(key.start, key.end),
  };
}
export function fromBase64(value: string) {
  if (
    typeof value !== "string" ||
    value.length > 30000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw new Error("Dato Base64 no válido.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
