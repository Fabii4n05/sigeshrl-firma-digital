import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import type { ContextType, Database, User, Row, Role } from "./types";
import { sha256, passwordHash, equal, uid, today } from "./crypto";
import { seed, demoProfiles } from "./seed";

export const api = new Hono<ContextType>();
const fail = (
  status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429,
  message: string,
): never => {
  throw new HTTPException(status, { message });
};
const now = () => new Date().toISOString();
const publicUser = (u: Row): User => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  service: u.service,
  specialty: u.specialty,
  detail_permission: u.detail_permission,
  enabled: u.enabled,
});
const roles = (u: User, ...allowed: Role[]) => {
  if (!allowed.includes(u.role))
    fail(403, "Tu perfil no tiene permiso para esta operación.");
};
const scoped = (u: User, record: Row) => {
  if (
    u.role === "medico" &&
    (record.professional_id !== u.id || record.service !== u.service)
  )
    fail(403, "La atención no está asignada a tu cuenta.");
  if (
    ["enfermeria", "admision", "farmacia"].includes(u.role) &&
    record.service !== u.service
  )
    fail(403, "El registro pertenece a otro servicio.");
};
const queryAll = async (db: Database, sql: string, ...values: any[]) =>
  (
    await db
      .prepare(sql)
      .bind(...values)
      .all()
  ).results;
function auditStmt(
  db: Database,
  u: User | null,
  action: string,
  record: string | null,
  result: string,
  detail = "",
) {
  return db
    .prepare(
      "INSERT INTO audit_events (id,user_id,user_name,action,record_id,result,detail,created_at) VALUES (?,?,?,?,?,?,?,?)",
    )
    .bind(
      uid(),
      u?.id ?? null,
      u?.name ?? "Visitante",
      action,
      record,
      result,
      detail,
      now(),
    );
}
const audit = async (
  db: Database,
  u: User | null,
  action: string,
  record: string | null,
  result: string,
  detail = "",
) => auditStmt(db, u, action, record, result, detail).run();
async function body(c: any) {
  try {
    return await c.req.json();
  } catch {
    return fail(400, "El contenido enviado no es válido.");
  }
}
function text(value: unknown, max = 4000, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    fail(422, "Revisa los campos obligatorios y su longitud.");
  return (value as string).trim();
}
function validDate(value: string) {
  const parsed = new Date(value + "T12:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail(422, "La fecha no es válida.");
  return value;
}
function period(c: any) {
  const date = today();
  const from = validDate(c.req.query("from") ?? date.slice(0, 7) + "-01");
  const to = validDate(c.req.query("to") ?? date);
  if (from > to) fail(422, "La fecha inicial debe ser anterior a la final.");
  return { from, to };
}
const appointmentSQL = `SELECT a.*,p.name patient_name,p.dni,p.history,p.birth_date,p.sex,p.allergies,u.name professional_name,e.id encounter_id FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=a.professional_id LEFT JOIN encounters e ON e.appointment_id=a.id`;
async function appointment(db: Database, id: string) {
  const a = await db
    .prepare(appointmentSQL + " WHERE a.id=?")
    .bind(id)
    .first();
  if (!a) fail(404, "No se encontró la cita.");
  return a!;
}
async function encounter(db: Database, id: string) {
  const e = await db
    .prepare(
      `SELECT e.*,a.professional_id,a.service,a.specialty,a.date,a.status appointment_status,a.patient_id,p.name patient_name,p.history,p.dni,p.birth_date,p.sex,p.allergies,u.name professional_name FROM encounters e JOIN appointments a ON a.id=e.appointment_id JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=a.professional_id WHERE e.id=?`,
    )
    .bind(id)
    .first();
  if (!e) fail(404, "No se encontró la atención.");
  return e!;
}
async function document(db: Database, id: string) {
  const d = await db
    .prepare(
      `SELECT d.*,a.professional_id,a.service,a.date,p.name patient_name,p.history,p.dni,u.name author_name,s.sha256,s.signed_at,s.signer_name,s.placement,s.method,x.id dispensation_id,x.dispensed_at FROM documents d JOIN encounters e ON e.id=d.encounter_id JOIN appointments a ON a.id=e.appointment_id JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=d.author_id LEFT JOIN signatures s ON s.document_id=d.id LEFT JOIN dispensations x ON x.document_id=d.id WHERE d.id=?`,
    )
    .bind(id)
    .first();
  if (!d) fail(404, "No se encontró el documento.");
  return d!;
}
function documentAccess(u: User, d: Row) {
  roles(u, "medico", "enfermeria", "supervision", "farmacia");
  scoped(u, d);
  if (
    u.role === "enfermeria" &&
    (d.type !== "enfermeria" || d.author_id !== u.id)
  )
    fail(403, "Solo puedes consultar tus registros de enfermería.");
  if (u.role === "farmacia" && (d.type !== "receta" || !d.is_current))
    fail(403, "Farmacia solo puede consultar recetas vigentes de su servicio.");
  if (u.role === "supervision" && !u.detail_permission)
    fail(403, "Necesitas permiso adicional para consultar el detalle.");
}
function parseDocument(d: Row) {
  return { ...d, payload: JSON.parse(d.payload), is_current: !!d.is_current };
}
function prescription(input: unknown) {
  if (!Array.isArray(input) || input.length > 20)
    fail(422, "La prescripción debe contener hasta 20 ítems.");
  return (input as Row[]).map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)
      fail(422, "Revisa las cantidades prescritas.");
    return {
      name: text(item.name, 160, true),
      dose: text(item.dose, 160, true),
      frequency: text(item.frequency, 160, true),
      duration: text(item.duration, 160, true),
      quantity,
    };
  });
}

api.onError((error, c) => {
  if (error instanceof HTTPException)
    return c.json({ error: error.message }, error.status);
  console.error("SIGESHRL API:", error.message);
  return c.json(
    {
      error:
        "No se pudo completar la operación. Tus datos guardados se conservan.",
    },
    500,
  );
});
api.use(
  "*",
  bodyLimit({
    maxSize: 1_000_000,
    onError: (c) =>
      c.json({ error: "El contenido enviado supera el tamaño admitido." }, 413),
  }),
);
api.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    if (c.req.header("x-sigeshrl-client") !== "web")
      fail(403, "La solicitud no proviene de la aplicación.");
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin)
      fail(403, "Origen de solicitud no permitido.");
    if (Number(c.req.header("content-length") ?? 0) > 1_000_000)
      fail(413, "El archivo supera el tamaño admitido.");
  }
  await next();
});
api.get("/health", (c) =>
  c.json({ ok: true, mode: "academic-demo", today: today() }),
);
api.get("/demo/profiles", (c) =>
  c.json({
    profiles: demoProfiles
      .filter((p) => p.id !== "medico-otro")
      .map(({ id, name, role, service, specialty }) => ({
        id,
        name,
        role,
        service,
        specialty,
      })),
    password: "Demo2026!",
  }),
);
api.post("/auth/login", async (c) => {
  await seed(c.env.DB);
  const data = await body(c);
  const username = text(data.username, 80, true).toLowerCase();
  const password = text(data.password, 128, true);
  const db = c.env.DB;
  const limitKey = await sha256(
    username + ":" + (c.req.header("cf-connecting-ip") ?? "local"),
  );
  const time = Date.now();
  const limit = await db
    .prepare("SELECT * FROM auth_limits WHERE key=?")
    .bind(limitKey)
    .first();
  if (limit && time - limit.window_start < 600000 && limit.attempts >= 10)
    fail(429, "Demasiados intentos fallidos. Espera diez minutos.");
  const u = await db
    .prepare("SELECT * FROM users WHERE username=?")
    .bind(username)
    .first();
  const hash = await passwordHash(password, u?.salt ?? "sigeshrl-non-existing");
  if (!u || !u.enabled || !equal(hash, u.password_hash)) {
    await db
      .prepare(
        `INSERT INTO auth_limits (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END`,
      )
      .bind(limitKey, time, time - 600000, time - 600000)
      .run();
    await audit(
      db,
      null,
      "ACCESO",
      null,
      "RECHAZADO",
      "Credenciales no válidas",
    );
    fail(401, "Usuario o contraseña incorrectos, o cuenta deshabilitada.");
  }
  const account = u!;
  await db.prepare("DELETE FROM auth_limits WHERE key=?").bind(limitKey).run();
  const old = getCookie(c, "sigeshrl_session");
  if (old)
    await db
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await sha256(old))
      .run();
  const token = uid() + uid();
  await db
    .prepare(
      "INSERT INTO sessions (token_hash,user_id,created_at,last_seen,expires_at) VALUES (?,?,?,?,?)",
    )
    .bind(await sha256(token), account.id, time, time, time + 8 * 60 * 60000)
    .run();
  setCookie(c, "sigeshrl_session", token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  await audit(db, publicUser(account), "ACCESO", account.id, "CORRECTO");
  return c.json({ user: publicUser(account) });
});
api.use("*", async (c, next) => {
  const token = getCookie(c, "sigeshrl_session");
  if (!token) fail(401, "Inicia sesión para continuar.");
  const tokenHash = await sha256(token!);
  const session = await c.env.DB.prepare(
    "SELECT s.*,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?",
  )
    .bind(tokenHash)
    .first();
  if (
    !session ||
    !session.enabled ||
    session.expires_at < Date.now() ||
    Date.now() - session.last_seen > 30 * 60000
  ) {
    if (session)
      await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(tokenHash)
        .run();
    deleteCookie(c, "sigeshrl_session", { path: "/" });
    fail(401, "La sesión terminó. Vuelve a ingresar.");
  }
  c.set("user", publicUser(session!));
  c.set("tokenHash", tokenHash);
  if (Date.now() - session!.last_seen > 30000)
    await c.env.DB.prepare("UPDATE sessions SET last_seen=? WHERE token_hash=?")
      .bind(Date.now(), tokenHash)
      .run();
  try {
    await next();
  } catch (e) {
    if (e instanceof HTTPException && e.status === 403)
      await audit(
        c.env.DB,
        c.get("user"),
        "ACCESO_RESTRINGIDO",
        null,
        "RECHAZADO",
        c.req.path,
      );
    throw e;
  }
});
api.get("/auth/me", (c) => c.json({ user: c.get("user") }));
api.post("/auth/logout", async (c) => {
  await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
    .bind(c.get("tokenHash"))
    .run();
  await audit(c.env.DB, c.get("user"), "SALIDA", null, "CORRECTO");
  deleteCookie(c, "sigeshrl_session", { path: "/" });
  return c.json({ ok: true });
});
api.get("/bootstrap", async (c) => {
  const meta = await c.env.DB.prepare(
    "SELECT value FROM demo_meta WHERE key='seed_date'",
  ).first();
  return c.json({
    user: c.get("user"),
    today: today(),
    seedDate: meta?.value,
    services: ["Consulta Externa", "Hospitalización", "Emergencia"],
  });
});

api.get("/appointments", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria", "admision");
  const date = validDate(c.req.query("date") ?? today());
  const conditions = ["a.date=?"];
  const values: any[] = [date];
  if (u.role === "medico") {
    conditions.push("a.professional_id=?");
    values.push(u.id);
  }
  conditions.push("a.service=?");
  values.push(u.service);
  for (const [field, col] of [
    ["specialty", "a.specialty"],
    ["professional", "a.professional_id"],
  ] as const) {
    const value = c.req.query(field);
    if (value) {
      conditions.push(`${col}=?`);
      values.push(value);
    }
  }
  const search = c.req.query("search");
  if (search) {
    conditions.push("(p.name LIKE ? OR p.history LIKE ? OR p.dni LIKE ?)");
    values.push(
      `%${search.slice(0, 100)}%`,
      `%${search.slice(0, 100)}%`,
      `%${search.slice(0, 100)}%`,
    );
  }
  const rows = await queryAll(
    c.env.DB,
    appointmentSQL + " WHERE " + conditions.join(" AND ") + " ORDER BY a.time",
    ...values,
  );
  const docs = await queryAll(
    c.env.DB,
    `SELECT d.encounter_id,COUNT(*) total,SUM(CASE WHEN d.status='signed' THEN 1 ELSE 0 END) signed FROM documents d WHERE d.is_current=1 GROUP BY d.encounter_id`,
  );
  return c.json({
    appointments: rows.map((a) => ({
      ...a,
      documents: docs.find((d) => d.encounter_id === a.encounter_id) ?? {
        total: 0,
        signed: 0,
      },
    })),
    date,
  });
});
api.get("/patients/by-dni/:dni", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria", "admision");
  const dni = c.req.param("dni");
  if (!/^\d{8}$/.test(dni)) fail(422, "El DNI debe tener ocho dígitos.");
  const p = await c.env.DB.prepare(
    "SELECT id,name,dni,history,birth_date,sex FROM patients WHERE dni=?",
  )
    .bind(dni)
    .first();
  if (!p)
    fail(
      404,
      "El DNI no está registrado en esta demostración. No se consultó RENIEC.",
    );
  const all = await queryAll(
    c.env.DB,
    appointmentSQL +
      " WHERE a.patient_id=? AND a.service=?" +
      (u.role === "medico" ? " AND a.professional_id=?" : "") +
      " ORDER BY a.date DESC,a.time DESC",
    p!.id,
    u.service,
    ...(u.role === "medico" ? [u.id] : []),
  );
  if (!all.length)
    fail(403, "El paciente no tiene citas asignadas dentro de tu ámbito.");
  await audit(
    c.env.DB,
    u,
    "LECTURA_DNI",
    p!.id,
    "CONFIRMADO",
    "Lectura óptica o ingreso manual; identidad no verificada por RENIEC",
  );
  return c.json({ patient: p, appointments: all });
});
api.post("/appointments/:id/confirm", async (c) => {
  const u = c.get("user");
  roles(u, "admision");
  const a = await appointment(c.env.DB, c.req.param("id"));
  scoped(u, a);
  await audit(c.env.DB, u, "CONFIRMAR_CITA", a.id, "CORRECTO");
  return c.json({
    ok: true,
    message: "Llegada del paciente confirmada en la bitácora.",
  });
});
api.post("/appointments/:id/open", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria");
  const db = c.env.DB;
  const a = await appointment(db, c.req.param("id"));
  scoped(u, a);
  const encounterId = a.encounter_id ?? uid("at-");
  await db.batch([
    db
      .prepare(
        "INSERT OR IGNORE INTO encounters (id,appointment_id,updated_at) VALUES (?,?,?)",
      )
      .bind(encounterId, a.id, now()),
    db
      .prepare(
        "UPDATE appointments SET status=CASE WHEN status='programada' THEN 'en_atencion' ELSE status END WHERE id=?",
      )
      .bind(a.id),
    auditStmt(db, u, "ABRIR_ATENCION", a.id, "CORRECTO"),
  ]);
  const real = await db
    .prepare("SELECT id FROM encounters WHERE appointment_id=?")
    .bind(a.id)
    .first();
  return c.json({ encounterId: real!.id });
});
api.get("/encounters/:id", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria");
  const e = await encounter(c.env.DB, c.req.param("id"));
  scoped(u, e);
  const docs = await queryAll(
    c.env.DB,
    `SELECT d.id,d.type,d.version,d.status,d.is_current,d.author_id,d.created_at,d.last_error,s.signed_at,s.signer_name FROM documents d LEFT JOIN signatures s ON s.document_id=d.id WHERE d.encounter_id=? ORDER BY d.type,d.version DESC`,
    e.id,
  );
  const result =
    u.role === "enfermeria"
      ? {
          id: e.id,
          appointment_id: e.appointment_id,
          professional_id: e.professional_id,
          service: e.service,
          specialty: e.specialty,
          date: e.date,
          patient_id: e.patient_id,
          patient_name: e.patient_name,
          history: e.history,
          dni: e.dni,
          birth_date: e.birth_date,
          sex: e.sex,
          allergies: e.allergies,
          nursing: e.nursing,
          version: e.version,
          updated_at: e.updated_at,
          appointment_status: e.appointment_status,
        }
      : { ...e, prescription: JSON.parse(e.prescription) };
  return c.json({
    encounter: result,
    documents:
      u.role === "enfermeria"
        ? docs.filter((d) => d.type === "enfermeria" && d.author_id === u.id)
        : docs,
  });
});
api.put("/encounters/:id", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria");
  const db = c.env.DB;
  const e = await encounter(db, c.req.param("id"));
  scoped(u, e);
  const input = await body(c);
  if (input.version !== e.version)
    fail(409, "La atención cambió en otra ventana. Recarga antes de guardar.");
  const kinds = u.role === "medico" ? ["nota", "receta"] : ["enfermeria"];
  const current = await queryAll(
    db,
    "SELECT * FROM documents WHERE encounter_id=? AND is_current=1",
    e.id,
  );
  const hasSigned = current.some(
    (d) => kinds.includes(d.type) && d.status === "signed",
  );
  if (hasSigned && !input.newVersion)
    fail(
      409,
      "Existe un documento firmado. Crea una nueva versión para conservar el original.",
    );
  const reason =
    u.role === "medico" ? text(input.reason, 4000, true) : e.reason;
  const diagnosis =
    u.role === "medico" ? text(input.diagnosis, 2000, true) : e.diagnosis;
  const evolution =
    u.role === "medico" ? text(input.evolution, 8000, true) : e.evolution;
  const nursing =
    u.role === "enfermeria" ? text(input.nursing, 8000, true) : e.nursing;
  const items =
    u.role === "medico"
      ? prescription(input.prescription)
      : JSON.parse(e.prescription);
  const stamps = [];
  const editToken = uid();
  stamps.push(
    db
      .prepare(
        "UPDATE encounters SET reason=?,diagnosis=?,evolution=?,prescription=?,nursing=?,version=version+1,updated_at=?,edit_token=? WHERE id=? AND version=?",
      )
      .bind(
        reason,
        diagnosis,
        evolution,
        JSON.stringify(items),
        nursing,
        now(),
        editToken,
        e.id,
        e.version,
      ),
  );
  for (const type of kinds) {
    const previous = current.find((d) => d.type === type);
    const version = (previous?.version ?? 0) + 1;
    if (previous)
      stamps.push(
        db
          .prepare(
            "UPDATE documents SET is_current=0 WHERE id=? AND EXISTS (SELECT 1 FROM encounters WHERE id=? AND edit_token=?)",
          )
          .bind(previous.id, e.id, editToken),
      );
    if (type === "receta" && !items.length) continue;
    const id = uid(`${type}-`);
    const payload = JSON.stringify({
      id,
      type,
      version,
      patient: {
        id: e.patient_id,
        name: e.patient_name,
        dni: e.dni,
        history: e.history,
      },
      encounterId: e.id,
      appointmentId: e.appointment_id,
      date: e.date,
      service: e.service,
      author: u.name,
      ...(type === "enfermeria"
        ? { nursing }
        : type === "receta"
          ? { prescription: items }
          : { reason, diagnosis, evolution }),
    });
    stamps.push(
      db
        .prepare(
          "INSERT INTO documents (id,encounter_id,type,author_id,version,payload,status,is_current,created_at) SELECT ?,?,?,?,?,?,'pending',1,? WHERE EXISTS (SELECT 1 FROM encounters WHERE id=? AND edit_token=?)",
        )
        .bind(id, e.id, type, u.id, version, payload, now(), e.id, editToken),
    );
  }
  stamps.push(
    auditStmt(
      db,
      u,
      hasSigned ? "NUEVA_VERSION" : "GUARDAR_ATENCION",
      e.id,
      "CORRECTO",
      `Versión de atención ${e.version + 1}`,
    ),
  );
  const result = await db.batch(stamps);
  if (!result[0].meta?.changes)
    fail(409, "La atención cambió. Recarga antes de guardar.");
  return c.json({ ok: true, version: e.version + 1 });
});
api.post("/encounters/:id/finish", async (c) => {
  const u = c.get("user");
  roles(u, "medico");
  const db = c.env.DB;
  const e = await encounter(db, c.req.param("id"));
  scoped(u, e);
  if (!e.reason || !e.diagnosis || !e.evolution)
    fail(422, "Guarda primero el registro clínico.");
  await db.batch([
    db
      .prepare("UPDATE appointments SET status='atendida' WHERE id=?")
      .bind(e.appointment_id),
    auditStmt(
      db,
      u,
      "FINALIZAR_ATENCION",
      e.id,
      "CORRECTO",
      "El estado de firma se mantiene separado",
    ),
  ]);
  return c.json({ ok: true });
});

api.get("/documents", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria");
  const db = c.env.DB;
  const where = ["d.author_id=?", "d.is_current=1", "a.service=?"];
  const values: any[] = [u.id, u.service];
  if (c.req.query("encounter")) {
    where.push("d.encounter_id=?");
    values.push(c.req.query("encounter"));
  }
  const rows = await queryAll(
    db,
    `SELECT d.id,d.encounter_id,d.type,d.version,d.status,d.created_at,d.last_error,p.name patient_name,p.history,a.service,a.date,s.signed_at FROM documents d JOIN encounters e ON e.id=d.encounter_id JOIN appointments a ON a.id=e.appointment_id JOIN patients p ON p.id=a.patient_id LEFT JOIN signatures s ON s.document_id=d.id WHERE ${where.join(" AND ")} ORDER BY CASE WHEN d.status='pending' THEN 0 ELSE 1 END,a.date DESC,p.name`,
    ...values,
  );
  return c.json({ documents: rows });
});
api.get("/documents/:id", async (c) => {
  const d = await document(c.env.DB, c.req.param("id"));
  documentAccess(c.get("user"), d);
  return c.json({ document: parseDocument(d) });
});
api.post("/documents/:id/sign", async (c) => {
  const u = c.get("user");
  roles(u, "medico", "enfermeria");
  const db = c.env.DB;
  const d = await document(db, c.req.param("id"));
  scoped(u, d);
  if (d.author_id !== u.id)
    fail(403, "Solo el autor autorizado puede firmar este documento.");
  if (!d.is_current)
    fail(409, "Esta versión fue reemplazada y no se puede firmar.");
  const input = await body(c);
  if (input.version !== d.version)
    fail(409, "La versión cambió. Revisa nuevamente el documento.");
  if (d.status === "signed")
    return c.json({
      ok: true,
      alreadySigned: true,
      document: parseDocument(d),
    });
  const outcome = input.outcome ?? "success";
  if (!["success", "rejected", "unavailable"].includes(outcome))
    fail(422, "Selecciona un resultado de simulación.");
  if (outcome !== "success") {
    const error =
      outcome === "rejected"
        ? "Certificado de prueba rechazado. El documento sigue pendiente."
        : "El firmador de prueba no responde. Puedes reintentar sin perder el documento.";
    await db.batch([
      db
        .prepare(
          "UPDATE documents SET last_error=? WHERE id=? AND status='pending'",
        )
        .bind(error, d.id),
      auditStmt(
        db,
        u,
        "FIRMA_SIMULADA",
        d.id,
        outcome === "rejected" ? "RECHAZADO" : "NO_DISPONIBLE",
        error,
      ),
    ]);
    return c.json({ ok: false, error, pending: true });
  }
  if (!["left", "right"].includes(input.placement))
    fail(422, "Selecciona la ubicación de la marca.");
  const hash = await sha256(d.payload);
  const signedAt = now();
  const result = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO signatures (id,document_id,signer_id,signer_name,signed_at,sha256,placement) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM documents WHERE id=? AND is_current=1 AND status='pending' AND version=?)`,
      )
      .bind(
        uid(),
        d.id,
        u.id,
        u.name,
        signedAt,
        hash,
        input.placement,
        d.id,
        d.version,
      ),
    db
      .prepare(
        "UPDATE documents SET status='signed',last_error=NULL WHERE id=? AND is_current=1 AND EXISTS (SELECT 1 FROM signatures WHERE document_id=?)",
      )
      .bind(d.id, d.id),
    db
      .prepare(
        `INSERT INTO audit_events (id,user_id,user_name,action,record_id,result,detail,created_at) VALUES (?,?,?,'FIRMA_SIMULADA',?,CASE WHEN EXISTS (SELECT 1 FROM signatures WHERE document_id=?) THEN 'VALIDADA_EN_DEMO' ELSE 'CONFLICTO_DE_VERSION' END,?,?)`,
      )
      .bind(
        uid(),
        u.id,
        u.name,
        d.id,
        d.id,
        "Simulación académica. No es una firma digital IOFE.",
        now(),
      ),
  ]);
  const updated = await document(db, d.id);
  if (updated.status !== "signed")
    fail(409, "El documento cambió durante la firma. Recarga la bandeja.");
  return c.json({
    ok: true,
    alreadySigned: !result[0].meta?.changes,
    document: parseDocument(updated),
  });
});
api.post("/documents/:id/verify", async (c) => {
  const u = c.get("user");
  const db = c.env.DB;
  const d = await document(db, c.req.param("id"));
  documentAccess(u, d);
  const input = await body(c);
  if (
    input.rawPayload !== undefined &&
    (typeof input.rawPayload !== "string" || input.rawPayload.length > 100000)
  )
    fail(422, "La copia enviada no es válida.");
  const raw = input.rawPayload ?? d.payload;
  const hash = await sha256(raw);
  const valid = !!d.sha256 && equal(hash, d.sha256);
  await audit(
    db,
    u,
    "VERIFICAR_INTEGRIDAD",
    d.id,
    valid ? "COINCIDE" : "NO_COINCIDE",
    "Verificación SHA-256 de la copia académica; no verifica certificado IOFE.",
  );
  return c.json({
    valid,
    sha256: hash,
    expected: d.sha256 ?? null,
    method: "SHA-256",
    scope:
      "Integridad de la copia de demostración. Sin validación de identidad o certificado RENIEC.",
  });
});
api.get("/documents/:id/export", async (c) => {
  const u = c.get("user");
  const db = c.env.DB;
  const d = await document(db, c.req.param("id"));
  documentAccess(u, d);
  await audit(db, u, "EXPORTAR_DOCUMENTO", d.id, "CORRECTO");
  return c.json({
    format: "SIGESHRL_DEMO_1",
    disclaimer:
      "Demostración académica. No es una firma digital IOFE ni un documento médico válido.",
    rawPayload: d.payload,
    document: JSON.parse(d.payload),
    signature: d.sha256
      ? {
          method: d.method,
          sha256: d.sha256,
          signer: d.signer_name,
          signedAt: d.signed_at,
          placement: d.placement,
        }
      : null,
  });
});

api.get("/coverage", async (c) => {
  const u = c.get("user");
  roles(u, "supervision");
  const db = c.env.DB;
  const { from, to } = period(c);
  const rows = await queryAll(
    db,
    `SELECT a.service,p.id patient_id,COUNT(d.id) total,SUM(CASE WHEN d.status='signed' AND s.id IS NOT NULL THEN 1 ELSE 0 END) signed FROM documents d JOIN encounters e ON e.id=d.encounter_id JOIN appointments a ON a.id=e.appointment_id JOIN patients p ON p.id=a.patient_id LEFT JOIN signatures s ON s.document_id=d.id WHERE d.is_current=1 AND a.date BETWEEN ? AND ? GROUP BY a.service,p.id`,
    from,
    to,
  );
  const services = ["Consulta Externa", "Hospitalización", "Emergencia"].map(
    (service) => {
      const histories = rows.filter((r) => r.service === service);
      const complete = histories.filter((r) => r.total === r.signed).length;
      return {
        service,
        evaluated: histories.length,
        complete,
        pending: histories.length - complete,
        percentage: histories.length
          ? Math.round((complete / histories.length) * 10000) / 100
          : null,
      };
    },
  );
  return c.json({
    services,
    from,
    to,
    detailPermission: !!u.detail_permission,
    formula:
      "Historias con todos sus documentos vigentes firmados en la demo / historias evaluadas × 100",
  });
});
api.get("/coverage/detail", async (c) => {
  const u = c.get("user");
  roles(u, "supervision");
  if (!u.detail_permission)
    fail(403, "Tu cuenta no tiene el permiso adicional de detalle.");
  const { from, to } = period(c);
  const service = c.req.query("service");
  if (
    !["Consulta Externa", "Hospitalización", "Emergencia"].includes(
      service ?? "",
    )
  )
    fail(422, "Selecciona un servicio.");
  const rows = await queryAll(
    c.env.DB,
    `SELECT d.id,d.type,d.version,d.status,d.last_error,p.name patient_name,p.history,u.name author_name,a.date,s.signed_at,s.signer_name FROM documents d JOIN encounters e ON e.id=d.encounter_id JOIN appointments a ON a.id=e.appointment_id JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=d.author_id LEFT JOIN signatures s ON s.document_id=d.id WHERE d.is_current=1 AND a.service=? AND a.date BETWEEN ? AND ? ORDER BY CASE WHEN d.status='pending' THEN 0 ELSE 1 END,p.history,d.type`,
    service,
    from,
    to,
  );
  await audit(c.env.DB, u, "CONSULTAR_COBERTURA", service!, "CORRECTO");
  return c.json({ documents: rows, service });
});
api.get("/pharmacy", async (c) => {
  const u = c.get("user");
  roles(u, "farmacia");
  const { from, to } = period(c);
  const rows = await queryAll(
    c.env.DB,
    `SELECT d.id,d.encounter_id,d.version,d.status,d.payload,p.name patient_name,p.history,p.dni,a.service,a.date,u.name author_name,s.signed_at,x.id dispensation_id,x.dispensed_at FROM documents d JOIN encounters e ON e.id=d.encounter_id JOIN appointments a ON a.id=e.appointment_id JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=d.author_id LEFT JOIN signatures s ON s.document_id=d.id LEFT JOIN dispensations x ON x.document_id=d.id WHERE d.type='receta' AND d.is_current=1 AND a.service=? AND a.date BETWEEN ? AND ? ORDER BY a.date DESC,p.history`,
    u.service,
    from,
    to,
  );
  return c.json({
    prescriptions: rows.map((d) => ({
      ...d,
      items: JSON.parse(d.payload).prescription,
      state: d.dispensation_id
        ? "dispensada"
        : d.status === "signed" && d.signed_at
          ? "lista"
          : "espera",
      payload: undefined,
    })),
  });
});
api.post("/pharmacy/:id/dispense", async (c) => {
  const u = c.get("user");
  roles(u, "farmacia");
  const db = c.env.DB;
  const d = await document(db, c.req.param("id"));
  documentAccess(u, d);
  if (
    d.status !== "signed" ||
    !d.sha256 ||
    !equal(await sha256(d.payload), d.sha256)
  )
    fail(
      409,
      "La receta debe pasar la validación de firma e integridad de la demo.",
    );
  const items = JSON.parse(d.payload).prescription;
  const result = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO dispensations (id,document_id,user_id,dispensed_at,items) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM documents WHERE id=? AND status='signed' AND is_current=1)`,
      )
      .bind(uid(), d.id, u.id, now(), JSON.stringify(items), d.id),
    auditStmt(
      db,
      u,
      "DISPENSACION_SIMULADA",
      d.id,
      "CORRECTO",
      "Entrega académica, sin movimiento de inventario real",
    ),
  ]);
  const stored = await db
    .prepare("SELECT id,dispensed_at FROM dispensations WHERE document_id=?")
    .bind(d.id)
    .first();
  if (!stored) fail(409, "La receta cambió. Recarga antes de dispensar.");
  return c.json({
    ok: true,
    alreadyDispensed: !result[0].meta?.changes,
    dispensation: stored,
  });
});

api.get("/audit", async (c) => {
  const u = c.get("user");
  roles(u, "admin", "supervision");
  const limit = Math.min(
    200,
    Math.max(1, Number(c.req.query("limit") ?? 100) || 100),
  );
  const rows = await queryAll(
    c.env.DB,
    `SELECT id,user_name,action,record_id,result,detail,created_at FROM audit_events ${u.role === "supervision" ? "WHERE action IN ('FIRMA_SIMULADA','VERIFICAR_INTEGRIDAD','DISPENSACION_SIMULADA','CONSULTAR_COBERTURA')" : ""} ORDER BY created_at DESC LIMIT ?`,
    limit,
  );
  return c.json({ events: rows });
});
api.get("/admin/users", async (c) => {
  roles(c.get("user"), "admin");
  return c.json({
    users: (await queryAll(c.env.DB, "SELECT * FROM users ORDER BY role")).map(
      publicUser,
    ),
  });
});
api.patch("/admin/users/:id", async (c) => {
  const u = c.get("user");
  roles(u, "admin");
  const input = await body(c);
  const id = c.req.param("id");
  if (id === u.id)
    fail(422, "No puedes modificar tu propia cuenta de administración.");
  const found = await c.env.DB.prepare("SELECT id FROM users WHERE id=?")
    .bind(id)
    .first();
  if (!found) fail(404, "La cuenta no existe.");
  if (
    typeof input.enabled !== "boolean" ||
    typeof input.detailPermission !== "boolean"
  )
    fail(422, "Los permisos enviados no son válidos.");
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE users SET enabled=?,detail_permission=? WHERE id=?",
    ).bind(input.enabled ? 1 : 0, input.detailPermission ? 1 : 0, id),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
    auditStmt(c.env.DB, u, "CAMBIAR_PERMISOS", id, "CORRECTO"),
  ]);
  return c.json({ ok: true });
});
api.all("*", (c) =>
  c.json({ error: "La operación solicitada no existe." }, 404),
);
