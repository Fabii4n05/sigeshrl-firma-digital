import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, X509Certificate } from "node:crypto";
import { Hono } from "hono";
import { api } from "../server/api";
import { SQLiteAdapter } from "../server/sqlite";
import { seed } from "../server/seed";
import { certificateInfo } from "../server/nfc-certificate";
import type { ContextType } from "../server/types";

// Certificado autofirmado creado para la prueba. Nunca se confía en su emisor.
function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const der = (tag: number, ...parts: Buffer[]) => {
    const value = Buffer.concat(parts),
      size = value.length;
    const length =
      size < 128
        ? Buffer.from([size])
        : size < 256
          ? Buffer.from([0x81, size])
          : Buffer.from([0x82, size >> 8, size & 255]);
    return Buffer.concat([Buffer.from([tag]), length, value]);
  };
  const oid = (value: string) => der(6, Buffer.from(value, "hex"));
  const seq = (...parts: Buffer[]) => der(0x30, ...parts);
  const text = (value: string) => der(0x0c, Buffer.from(value));
  const field = (type: string, value: string) =>
    der(0x31, seq(oid(type), text(value)));
  const algorithm = seq(oid("2a864886f70d01010b"), der(5));
  const name = seq(
    field("550403", "Certificado ficticio para pruebas"),
    field("550405", "PNOPE-12345678"),
  );
  const validity = seq(
    der(0x17, Buffer.from("240101000000Z")),
    der(0x17, Buffer.from("491231235959Z")),
  );
  const tbs = seq(
    der(0xa0, der(2, Buffer.from([2]))),
    der(2, Buffer.from([1])),
    algorithm,
    name,
    validity,
    name,
    publicKey.export({ type: "spki", format: "der" }) as Buffer,
  );
  const certificate = seq(
    tbs,
    algorithm,
    der(3, Buffer.from([0]), sign("sha256", tbs, privateKey)),
  );
  assert.equal(new X509Certificate(certificate).verify(publicKey), true);
  return { privateKey, certificate };
}

test("La prueba NFC verifica criptografía, rechaza alteraciones y no habilita una receta", async () => {
  const db = new SQLiteAdapter(":memory:");
  await seed(db);
  const app = new Hono<ContextType>();
  app.route("/api", api);
  const call = async (path: string, cookie = "", data?: unknown) => {
    const response = await app.request(
      "http://localhost/api" + path,
      {
        method: data === undefined ? "GET" : "POST",
        headers: {
          cookie,
          "content-type": "application/json",
          "x-sigeshrl-client": "web",
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      },
      { DB: db },
    );
    return {
      status: response.status,
      data: (await response.json()) as any,
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  };
  const doctor = await call("/auth/login", "", {
    username: "medico",
    password: "Demo2026!",
  });
  const nurse = await call("/auth/login", "", {
    username: "enfermeria",
    password: "Demo2026!",
  });
  const docs = await call("/documents", doctor.cookie);
  const document = docs.data.documents.find(
    (d: any) => d.patient_name === "Paciente 014" && d.type === "receta",
  );
  const { privateKey, certificate } = fixture();
  assert.equal(certificateInfo(certificate).dni, "12345678");
  const create = () =>
    call("/nfc/challenges", doctor.cookie, {
      dni: "12345678",
      documentId: document.id,
    });
  assert.equal(
    (
      await call("/nfc/challenges", nurse.cookie, {
        dni: "12345678",
        documentId: document.id,
      })
    ).status,
    403,
  );
  const request = await create();
  assert.equal(request.status, 200);
  assert.equal(
    JSON.parse(Buffer.from(request.data.request, "base64url").toString())
      .documentId,
    document.id,
  );
  const proof = {
    format: "SIGESHRL_NFC_PROOF_1",
    payload: request.data.payload,
    certificate: certificate.toString("base64"),
    signature: sign(
      "sha256",
      Buffer.from(request.data.payload),
      privateKey,
    ).toString("base64"),
    cardVersion: "test",
  };
  const verify = (data: unknown) =>
    call("/nfc/challenges/" + request.data.id + "/verify", doctor.cookie, data);
  assert.equal(
    (await verify({ ...proof, payload: proof.payload + " " })).status,
    422,
  );
  assert.equal(
    (
      await verify({
        ...proof,
        signature: Buffer.alloc(256).toString("base64"),
      })
    ).status,
    422,
  );
  const ok = await verify(proof);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.trust, "not-validated");
  assert.equal(ok.data.scope, "technical-proof");
  assert.equal((await verify(proof)).status, 409);
  const current = await call("/documents/" + document.id, doctor.cookie);
  assert.equal(current.data.document.status, "pending");
  assert.equal(
    db.raw
      .prepare("SELECT COUNT(*) AS n FROM signatures WHERE document_id=?")
      .get(document.id)!.n,
    0,
  );
  assert.equal(
    db.raw.prepare("SELECT COUNT(*) AS n FROM nfc_proofs").get()!.n,
    1,
  );
  const expired = await create();
  db.raw
    .prepare("UPDATE nfc_trials SET expires_at=0 WHERE id=?")
    .run(expired.data.id);
  assert.equal(
    (
      await call(
        "/nfc/challenges/" + expired.data.id + "/verify",
        doctor.cookie,
        proof,
      )
    ).status,
    409,
  );
  const mismatch = await call("/nfc/challenges", doctor.cookie, {
    dni: "87654321",
    documentId: document.id,
  });
  assert.equal(
    (
      await call(
        "/nfc/challenges/" + mismatch.data.id + "/verify",
        doctor.cookie,
        {
          ...proof,
          payload: mismatch.data.payload,
          signature: sign(
            "sha256",
            Buffer.from(mismatch.data.payload),
            privateKey,
          ).toString("base64"),
        },
      )
    ).status,
    422,
  );
  db.raw.close();
});
