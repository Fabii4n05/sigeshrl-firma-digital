import type { Database } from "./types";
import { today, passwordHash, sha256 } from "./crypto";
export const DEMO_PASSWORD = "Demo2026!";
export const demoProfiles = [
  {
    id: "medico",
    username: "medico",
    name: "Dra. Lucía Mendoza",
    role: "medico",
    service: "Consulta Externa",
    specialty: "Medicina Interna",
    detail: 0,
  },
  {
    id: "enfermeria",
    username: "enfermeria",
    name: "Lic. Andrea Torres",
    role: "enfermeria",
    service: "Consulta Externa",
    specialty: "Enfermería",
    detail: 0,
  },
  {
    id: "admision",
    username: "admision",
    name: "Rosa del Carmen Ruiz",
    role: "admision",
    service: "Consulta Externa",
    specialty: "Admisión",
    detail: 0,
  },
  {
    id: "supervision",
    username: "supervision",
    name: "Dr. Gabriel Salas",
    role: "supervision",
    service: "Todos",
    specialty: "Supervisión clínica",
    detail: 1,
  },
  {
    id: "farmacia",
    username: "farmacia",
    name: "Q. F. Elena Ríos",
    role: "farmacia",
    service: "Consulta Externa",
    specialty: "Farmacia ambulatoria",
    detail: 0,
  },
  {
    id: "admin",
    username: "admin",
    name: "Carlos Vega",
    role: "admin",
    service: "Administración",
    specialty: "Administración de accesos",
    detail: 0,
  },
  {
    id: "medico-otro",
    username: "medico.otros",
    name: "Dr. Martín Pérez",
    role: "medico",
    service: "Hospitalización",
    specialty: "Medicina Interna",
    detail: 0,
  },
];
export async function seed(db: Database) {
  if (
    await db
      .prepare("SELECT value FROM demo_meta WHERE key='seed_version'")
      .first()
  )
    return;
  const date = today();
  const yesterdayDate = new Date(`${date}T12:00:00-05:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
  }).format(yesterdayDate);
  const now = new Date().toISOString();
  const userStatements = await Promise.all(
    demoProfiles.map(async (u) => {
      const salt = crypto.randomUUID();
      const hash = await passwordHash(DEMO_PASSWORD, salt);
      return db
        .prepare(
          "INSERT OR IGNORE INTO users (id,username,name,role,service,specialty,password_hash,salt,detail_permission) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          u.id,
          u.username,
          u.name,
          u.role,
          u.service,
          u.specialty,
          hash,
          salt,
          u.detail,
        );
    }),
  );
  await db.batch(userStatements);
  const records = [];
  for (let n = 1; n <= 43; n++) {
    const id = String(n).padStart(3, "0");
    records.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO patients (id,dni,name,history,birth_date,sex,allergies) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(
          `p${id}`,
          String(n).padStart(8, "0"),
          `Paciente ${id}`,
          `HC-DEMO-${id}`,
          `${n === 14 ? "1988" : "1985"}-06-15`,
          n % 2 ? "F" : "M",
          n === 14 ? "Sin alergias registradas" : "Sin alergias registradas",
        ),
    );
  }
  await db.batch(records);
  for (let n = 1; n <= 43; n++) {
    const id = String(n).padStart(3, "0");
    const service =
      n <= 23 ? "Consulta Externa" : n <= 33 ? "Hospitalización" : "Emergencia";
    // 20 historias evaluadas en CE; 15, 22 y 23 tienen solo cita programada.
    const scheduled = [15, 22, 23].includes(n);
    const apDate = [13, 14, 15, 22, 23].includes(n) ? date : yesterday;
    const apTime =
      (
        {
          13: "08:30",
          14: "09:00",
          15: "09:30",
          22: "10:00",
          23: "10:30",
        } as Record<number, string>
      )[n] ??
      `${String(7 + Math.floor(n / 6)).padStart(2, "0")}:${n % 2 ? "30" : "00"}`;
    const owner = service === "Consulta Externa" ? "medico" : "medico-otro";
    await db
      .prepare(
        "INSERT OR IGNORE INTO appointments (id,patient_id,professional_id,service,specialty,room,date,time,type,status) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        `cita-${id}`,
        `p${id}`,
        owner,
        service,
        "Medicina Interna",
        "04",
        apDate,
        apTime,
        n === 13 ? "Primera consulta" : "Control",
        scheduled ? "programada" : "atendida",
      )
      .run();
    if (scheduled) continue;
    const prescription = [
      {
        name: "Medicamento de demostración A",
        dose: "Según prescripción de ejemplo",
        frequency: "Uso exclusivamente académico",
        duration: "No utilizar para tratamiento",
        quantity: 10,
      },
    ];
    const base = {
      reason: "Seguimiento clínico de demostración.",
      diagnosis: "Z00.0 · Evaluación de ejemplo",
      evolution:
        "Paciente ficticio. Registro creado para demostrar el circuito documental; no representa una indicación médica.",
      prescription,
    };
    await db
      .prepare(
        "INSERT OR IGNORE INTO encounters (id,appointment_id,reason,diagnosis,evolution,prescription,updated_at) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        `at-${id}`,
        `cita-${id}`,
        base.reason,
        base.diagnosis,
        base.evolution,
        JSON.stringify(prescription),
        now,
      )
      .run();
    const pending =
      service === "Consulta Externa"
        ? [1, 2, 14].includes(n)
        : service === "Hospitalización"
          ? [24, 25].includes(n)
          : [34, 35, 36, 37].includes(n);
    for (const type of ["nota", "receta"]) {
      const docId = `${type}-${id}-v1`;
      const payload = JSON.stringify({
        id: docId,
        type,
        version: 1,
        patient: {
          id: `p${id}`,
          name: `Paciente ${id}`,
          dni: String(n).padStart(8, "0"),
          history: `HC-DEMO-${id}`,
        },
        encounterId: `at-${id}`,
        appointmentId: `cita-${id}`,
        date: apDate,
        service,
        author: owner === "medico" ? "Dra. Lucía Mendoza" : "Dr. Martín Pérez",
        ...(type === "receta"
          ? { prescription }
          : {
              reason: base.reason,
              diagnosis: base.diagnosis,
              evolution: base.evolution,
            }),
      });
      await db
        .prepare(
          "INSERT OR IGNORE INTO documents (id,encounter_id,type,author_id,version,payload,status,created_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          docId,
          `at-${id}`,
          type,
          owner,
          1,
          payload,
          pending ? "pending" : "signed",
          now,
        )
        .run();
      if (!pending)
        await db
          .prepare(
            "INSERT OR IGNORE INTO signatures (id,document_id,signer_id,signer_name,signed_at,sha256,placement) VALUES (?,?,?,?,?,?,?)",
          )
          .bind(
            `firma-${docId}`,
            docId,
            owner,
            owner === "medico" ? "Dra. Lucía Mendoza" : "Dr. Martín Pérez",
            now,
            await sha256(payload),
            "right",
          )
          .run();
    }
  }
  await db
    .prepare(
      "INSERT OR IGNORE INTO demo_meta (key,value) VALUES ('seed_version','1')",
    )
    .run();
  await db
    .prepare(
      "INSERT OR IGNORE INTO demo_meta (key,value) VALUES ('seed_date',?)",
    )
    .bind(date)
    .run();
}
