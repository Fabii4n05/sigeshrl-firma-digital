import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
const source = path.resolve(process.env.SIGESHRL_DB ?? "data/sigeshrl.sqlite");
await access(source);
await mkdir("backups", { recursive: true });
const destination = path.resolve(
  "backups",
  `sigeshrl-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
const db = new DatabaseSync(source);
try {
  await backup(db, destination);
  console.log("Respaldo creado: " + destination);
} finally {
  db.close();
}
