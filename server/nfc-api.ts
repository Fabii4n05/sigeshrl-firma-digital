import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContextType } from "./types";
import { sha256, uid } from "./crypto";
import { certificateInfo, fromBase64 } from "./nfc-certificate";
export const nfcApi = new Hono<ContextType>();
const error = (status: 400 | 403 | 404 | 409 | 422, message: string): never => {
  throw new HTTPException(status, { message });
};
async function ownDocument(c: any, id: string) {
  const u = c.get("user");
  const d = await c.env.DB.prepare(
    "SELECT d.*,a.service FROM documents d JOIN encounters e ON e.id=d.encounter_id JOIN appointments a ON a.id=e.appointment_id WHERE d.id=?",
  )
    .bind(id)
    .first();
  if (!d) error(404, "No se encontró el documento.");
  if (
    !["medico", "enfermeria"].includes(u.role) ||
    d.author_id !== u.id ||
    d.service !== u.service
  )
    error(403, "La prueba corresponde al autor autorizado del documento.");
  if (!d.is_current) error(409, "El documento ya tiene una versión posterior.");
  return d;
}
nfcApi.post("/challenges", async (c) => {
  const input = await c.req.json();
  if (!/^\d{8}$/.test(input.dni ?? ""))
    error(422, "Escribe el DNI del titular del certificado, con ocho dígitos.");
  const d = await ownDocument(c, input.documentId);
  const id = uid();
  const payload = JSON.stringify({
    protocol: "SIGESHRL_NFC_1",
    challengeId: id,
    documentId: d.id,
    version: d.version,
    documentSha256: await sha256(d.payload),
    expectedDni: input.dni,
    nonce: uid(),
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
  });
  await c.env.DB.prepare(
    "INSERT INTO nfc_trials (id,user_id,document_id,payload,expires_at,used) VALUES (?,?,?,?,?,0)",
  )
    .bind(id, c.get("user").id, d.id, payload, Date.now() + 10 * 60000)
    .run();
  const bytes = new TextEncoder().encode(payload);
  const encoded = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return c.json({
    id,
    payload,
    request: encoded,
    deepLink: "sigeshrl-dnie://firmar?payload=" + encoded,
    expiresIn: 600,
  });
});
nfcApi.post("/challenges/:id/verify", async (c) => {
  const db = c.env.DB,
    u = c.get("user");
  const trial = await db
    .prepare("SELECT * FROM nfc_trials WHERE id=? AND user_id=?")
    .bind(c.req.param("id"), u.id)
    .first();
  if (!trial) error(404, "No se encontró la solicitud de prueba.");
  if (trial!.used || trial!.expires_at < Date.now())
    error(409, "La solicitud ya se utilizó o venció. Crea una nueva.");
  const d = await ownDocument(c, trial!.document_id);
  const input = await c.req.json();
  if (
    input.format !== "SIGESHRL_NFC_PROOF_1" ||
    input.payload !== trial!.payload
  )
    error(422, "La respuesta no corresponde a esta solicitud.");
  const challenge = JSON.parse(trial!.payload);
  if (challenge.documentSha256 !== (await sha256(d.payload)))
    error(409, "El contenido del documento cambió.");
  let info;
  let signature: Uint8Array;
  try {
    info = certificateInfo(fromBase64(input.certificate));
    signature = fromBase64(input.signature);
  } catch {
    error(422, "La respuesta no contiene un certificado o una firma válidos.");
  }
  if (info!.dni !== challenge.expectedDni)
    error(422, "El DNI del certificado no coincide con el titular indicado.");
  if (
    info!.notBefore.getTime() > Date.now() ||
    info!.notAfter.getTime() < Date.now()
  )
    error(422, "El certificado está fuera de su periodo de vigencia.");
  let valid = false;
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      info!.spki as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature! as BufferSource,
      new TextEncoder().encode(trial!.payload),
    );
  } catch {}
  if (!valid)
    error(422, "La firma criptográfica no coincide con la solicitud.");
  const time = new Date().toISOString();
  const results = await db.batch([
    db
      .prepare(
        "INSERT INTO nfc_proofs (id,trial_id,document_id,user_id,proof,verified_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM nfc_trials WHERE id=? AND used=0)",
      )
      .bind(
        uid(),
        trial!.id,
        d.id,
        u.id,
        JSON.stringify(input),
        time,
        trial!.id,
      ),
    db.prepare("UPDATE nfc_trials SET used=1 WHERE id=?").bind(trial!.id),
    db
      .prepare(
        "INSERT INTO audit_events (id,user_id,user_name,action,record_id,result,detail,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(
        uid(),
        u.id,
        u.name,
        "PRUEBA_CHIP_NFC",
        d.id,
        "FIRMA_CRIPTOGRAFICA_CORRECTA",
        "Prueba técnica. Cadena de confianza y revocación no verificadas; el estado clínico no cambia.",
        time,
      ),
  ]);
  if (!results[0].meta?.changes) error(409, "Esta respuesta ya fue procesada.");
  return c.json({
    valid: true,
    scope: "technical-proof",
    dni: info!.dni,
    subject: info!.subject,
    issuer: info!.issuer,
    notAfter: info!.notAfter.toISOString(),
    documentSha256: challenge.documentSha256,
    trust: "not-validated",
    message:
      "La firma corresponde a este contenido y a la clave pública del certificado. Esta prueba no valida la cadena de confianza ni la revocación y no habilita la receta.",
  });
});
