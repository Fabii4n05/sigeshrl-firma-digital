import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { api } from "../server/api";
import { SQLiteAdapter } from "../server/sqlite";
import { seed } from "../server/seed";
import { today, sha256 } from "../server/crypto";
import type { ContextType } from "../server/types";

async function harness() {
  const db = new SQLiteAdapter(":memory:");
  await seed(db);
  const app = new Hono<ContextType>();
  app.route("/api", api);
  async function call(
    path: string,
    cookie = "",
    method = "GET",
    data?: any,
    extra: Record<string, string> = {},
  ) {
    const response = await app.request(
      "http://localhost/api" + path,
      {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          "Content-Type": "application/json",
          "x-sigeshrl-client": "web",
          ...extra,
        },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      },
      { DB: db },
    );
    return {
      status: response.status,
      data: (await response.json()) as any,
      response,
    };
  }
  async function login(username: string) {
    const r = await call("/auth/login", "", "POST", {
      username,
      password: "Demo2026!",
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.response.headers.get("set-cookie")!.split(";")[0];
  }
  return { db, app, call, login };
}
test("El recorrido clínico aplica permisos, conserva versiones y evita entregas duplicadas", async (t) => {
  const { db, call, login } = await harness();
  let doctor = "",
    pharmacy = "",
    supervisor = "",
    admin = "",
    nurse = "",
    admission = "";
  await t.test(
    "La sesión es obligatoria y las credenciales se verifican",
    async () => {
      assert.equal((await call("/appointments")).status, 401);
      assert.equal(
        (
          await call("/auth/login", "", "POST", {
            username: "medico",
            password: "incorrecta",
          })
        ).status,
        401,
      );
      const r = await call("/auth/login", "", "POST", {
        username: "medico",
        password: "Demo2026!",
      });
      assert.equal(r.status, 200);
      assert.match(r.response.headers.get("set-cookie")!, /HttpOnly/);
      assert.match(r.response.headers.get("set-cookie")!, /SameSite=Strict/);
      assert.equal(r.data.user.password_hash, undefined);
      doctor = r.response.headers.get("set-cookie")!.split(";")[0];
      pharmacy = await login("farmacia");
      supervisor = await login("supervision");
      admin = await login("admin");
      nurse = await login("enfermeria");
      admission = await login("admision");
    },
  );
  await t.test(
    "Las solicitudes directas fuera de rol y servicio reciben 403",
    async () => {
      for (const path of [
        "/coverage",
        "/admin/users",
        "/documents/nota-024-v1",
      ])
        assert.equal((await call(path, doctor)).status, 403, path);
      assert.equal((await call("/encounters/at-014", admission)).status, 403);
      assert.equal(
        (await call("/documents/nota-014-v1", pharmacy)).status,
        403,
      );
      assert.equal((await call("/encounters/at-014", pharmacy)).status, 403);
      assert.equal((await call("/documents/nota-014-v1", nurse)).status, 403);
      assert.equal((await call("/encounters/at-014", admin)).status, 403);
    },
  );
  await t.test(
    "La agenda vincula cita e historia y la búsqueda no consulta RENIEC",
    async () => {
      const r = await call("/appointments?date=" + today(), doctor);
      assert.equal(r.status, 200);
      assert.equal(
        r.data.appointments.find((a: any) => a.patient_name === "Paciente 014")
          .encounter_id,
        "at-014",
      );
      assert.equal(
        (await call("/patients/by-dni/00000014", doctor)).data.patient.history,
        "HC-DEMO-014",
      );
      assert.equal(
        (await call("/patients/by-dni/87654321", doctor)).status,
        404,
      );
      assert.equal(
        (await call("/patients/by-dni/00000024", doctor)).status,
        403,
      );
      assert.equal((await call("/patients/by-dni/123", doctor)).status, 422);
      const a = await call("/appointments/cita-015/open", doctor, "POST", {});
      const b = await call("/appointments/cita-015/open", doctor, "POST", {});
      assert.equal(a.data.encounterId, b.data.encounterId);
    },
  );
  await t.test(
    "La cobertura inicial cuenta historias únicas y evita dividir entre cero",
    async () => {
      const r = await call("/coverage", supervisor);
      const s = r.data.services.find(
        (s: any) => s.service === "Consulta Externa",
      );
      assert.deepEqual([s.evaluated, s.complete, s.percentage], [20, 17, 85]);
      assert.equal(
        (await call("/coverage?from=2000-01-01&to=2000-01-02", supervisor)).data
          .services[0].percentage,
        null,
      );
      assert.equal(
        (await call("/coverage?from=2027-01-01&to=2026-01-01", supervisor))
          .status,
        422,
      );
    },
  );
  await t.test(
    "Farmacia solo recibe los campos de la receta y bloquea los pendientes",
    async () => {
      const r = await call("/documents/receta-014-v1", pharmacy);
      assert.equal(r.status, 200);
      assert.equal(r.data.document.payload.reason, undefined);
      assert.equal(r.data.document.payload.diagnosis, undefined);
      assert.equal(
        (await call("/pharmacy/receta-014-v1/dispense", pharmacy, "POST", {}))
          .status,
        409,
      );
    },
  );
  await t.test(
    "El rechazo y la falta de respuesta mantienen el documento pendiente",
    async () => {
      for (const outcome of ["rejected", "unavailable"]) {
        const r = await call("/documents/nota-014-v1/sign", doctor, "POST", {
          version: 1,
          placement: "right",
          outcome,
        });
        assert.equal(r.status, 200);
        assert.equal(r.data.ok, false);
        assert.equal(
          (await call("/documents/nota-014-v1", doctor)).data.document.status,
          "pending",
        );
      }
      assert.equal(
        Number(
          (await db
            .prepare("SELECT count(*) n FROM signatures WHERE document_id=?")
            .bind("nota-014-v1")
            .first())!.n,
        ),
        0,
      );
    },
  );
  await t.test(
    "Firmar solo la nota no completa la historia ni habilita la receta",
    async () => {
      assert.equal(
        (
          await call("/documents/nota-014-v1/sign", doctor, "POST", {
            version: 1,
            placement: "left",
            outcome: "success",
          })
        ).data.ok,
        true,
      );
      assert.equal(
        (await call("/coverage", supervisor)).data.services[0].percentage,
        85,
      );
      assert.equal(
        (await call("/pharmacy/receta-014-v1/dispense", pharmacy, "POST", {}))
          .status,
        409,
      );
    },
  );
  await t.test(
    "La copia original verifica su huella y una copia alterada falla",
    async () => {
      const exported = (await call("/documents/nota-014-v1/export", doctor))
        .data;
      assert.equal(
        exported.signature.sha256,
        await sha256(exported.rawPayload),
      );
      assert.equal(
        (
          await call("/documents/nota-014-v1/verify", doctor, "POST", {
            rawPayload: exported.rawPayload,
          })
        ).data.valid,
        true,
      );
      assert.equal(
        (
          await call("/documents/nota-014-v1/verify", doctor, "POST", {
            rawPayload: exported.rawPayload.replace(
              "Seguimiento",
              "Alteración",
            ),
          })
        ).data.valid,
        false,
      );
      assert.equal(
        (
          await call("/documents/nota-014-v1/verify", doctor, "POST", {
            rawPayload: exported.rawPayload + " ",
          })
        ).data.valid,
        false,
      );
    },
  );
  await t.test(
    "Las firmas concurrentes conservan una sola constancia y elevan la cobertura al 90%",
    async () => {
      const results = await Promise.all(
        [1, 2].map(() =>
          call("/documents/receta-014-v1/sign", doctor, "POST", {
            version: 1,
            placement: "right",
            outcome: "success",
          }),
        ),
      );
      for (const r of results) assert.equal(r.status, 200);
      assert.equal(
        Number(
          (await db
            .prepare("SELECT count(*) n FROM signatures WHERE document_id=?")
            .bind("receta-014-v1")
            .first())!.n,
        ),
        1,
      );
      const s = (await call("/coverage", supervisor)).data.services[0];
      assert.deepEqual([s.evaluated, s.complete, s.percentage], [20, 18, 90]);
    },
  );
  await t.test(
    "Dos solicitudes de dispensación solo registran una entrega",
    async () => {
      const results = await Promise.all(
        [1, 2].map(() =>
          call("/pharmacy/receta-014-v1/dispense", pharmacy, "POST", {}),
        ),
      );
      for (const r of results) assert.equal(r.status, 200);
      assert.equal(results.filter((r) => r.data.alreadyDispensed).length, 1);
      assert.equal(
        Number(
          (await db
            .prepare("SELECT count(*) n FROM dispensations WHERE document_id=?")
            .bind("receta-014-v1")
            .first())!.n,
        ),
        1,
      );
    },
  );
  let encounterData: any,
    originalPayload = "";
  await t.test(
    "La edición firmada exige una nueva versión y conserva el original",
    async () => {
      encounterData = (await call("/encounters/at-014", doctor)).data.encounter;
      originalPayload = (await db
        .prepare("SELECT payload FROM documents WHERE id=?")
        .bind("nota-014-v1")
        .first())!.payload;
      const payload = {
        ...encounterData,
        evolution: "Corrección de ejemplo; el original firmado se conserva.",
      };
      assert.equal(
        (await call("/encounters/at-014", doctor, "PUT", payload)).status,
        409,
      );
      const update = await call("/encounters/at-014", doctor, "PUT", {
        ...payload,
        newVersion: true,
      });
      assert.equal(update.status, 200);
      const old = (await call("/documents/nota-014-v1", doctor)).data.document;
      assert.equal(old.is_current, false);
      assert.equal(old.status, "signed");
      assert.equal(
        (await db
          .prepare("SELECT payload FROM documents WHERE id=?")
          .bind("nota-014-v1")
          .first())!.payload,
        originalPayload,
      );
      assert.equal(
        (await call("/documents/receta-014-v1", pharmacy)).status,
        403,
      );
      assert.equal(
        (await call("/encounters/at-014", doctor, "PUT", payload)).status,
        409,
      );
    },
  );
  await t.test(
    "Dos guardados simultáneos no pisan la versión que ganó",
    async () => {
      const e = (await call("/encounters/at-014", doctor)).data.encounter;
      const results = await Promise.all(
        ["A", "B"].map((s) =>
          call("/encounters/at-014", doctor, "PUT", {
            ...e,
            evolution: "Cambio concurrente " + s,
          }),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      const docs = (
        await call("/encounters/at-014", doctor)
      ).data.documents.filter((d: any) => d.is_current);
      assert.equal(docs.length, 2);
      assert.equal(docs.filter((d: any) => d.type === "nota").length, 1);
    },
  );
  await t.test(
    "Enfermería solo registra y firma su propio documento",
    async () => {
      const e = (await call("/encounters/at-014", nurse)).data.encounter;
      assert.equal(e.diagnosis, undefined);
      assert.equal(e.reason, undefined);
      assert.equal(
        (
          await call("/encounters/at-014", nurse, "PUT", {
            version: e.version,
            nursing: "Observaciones ficticias de enfermería.",
          })
        ).status,
        200,
      );
      const docs = (await call("/documents", nurse)).data.documents;
      const doc = docs.find((d: any) => d.encounter_id === "at-014");
      assert.equal(doc.type, "enfermeria");
      assert.equal(
        (
          await call("/documents/" + doc.id + "/sign", doctor, "POST", {
            version: doc.version,
            placement: "right",
            outcome: "success",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("/documents/" + doc.id + "/sign", nurse, "POST", {
            version: doc.version,
            placement: "right",
            outcome: "success",
          })
        ).data.ok,
        true,
      );
    },
  );
  await t.test(
    "Administración cambia permisos y revoca las sesiones afectadas",
    async () => {
      assert.equal(
        (
          await call("/admin/users/medico", admin, "PATCH", {
            enabled: false,
            detailPermission: false,
          })
        ).status,
        200,
      );
      assert.equal((await call("/appointments", doctor)).status, 401);
      assert.equal(
        (
          await call("/auth/login", "", "POST", {
            username: "medico",
            password: "Demo2026!",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("/admin/users/medico", admin, "PATCH", {
            enabled: true,
            detailPermission: false,
          })
        ).status,
        200,
      );
      doctor = await login("medico");
      assert.equal(
        (
          await call("/admin/users/supervision", admin, "PATCH", {
            enabled: true,
            detailPermission: false,
          })
        ).status,
        200,
      );
      supervisor = await login("supervision");
      assert.equal((await call("/coverage", supervisor)).status, 200);
      assert.equal(
        (await call("/coverage/detail?service=Consulta%20Externa", supervisor))
          .status,
        403,
      );
    },
  );
  await t.test(
    "Una sesión inactiva y una solicitud de otro origen se rechazan",
    async () => {
      assert.equal(
        (
          await call(
            "/auth/logout",
            doctor,
            "POST",
            {},
            { origin: "https://otro-sitio.example" },
          )
        ).status,
        403,
      );
      await db
        .prepare("UPDATE sessions SET last_seen=? WHERE user_id=?")
        .bind(Date.now() - 31 * 60000, "medico")
        .run();
      assert.equal((await call("/appointments", doctor)).status, 401);
    },
  );
  await t.test(
    "La bitácora registra resultados sin ofrecer edición o borrado",
    async () => {
      const events = (await call("/audit", admin)).data.events;
      assert.ok(
        events.some(
          (e: any) => e.action === "FIRMA_SIMULADA" && e.result === "RECHAZADO",
        ),
      );
      assert.ok(events.some((e: any) => e.action === "DISPENSACION_SIMULADA"));
      assert.equal((await call("/audit", admin, "DELETE", {})).status, 404);
    },
  );
  db.raw.close();
});
