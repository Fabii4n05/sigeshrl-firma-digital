import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, copyFile, access, unlink } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
const sourceArg = process.argv[2];
if (!sourceArg || process.argv[3] !== "--confirm") {
  console.error(
    "Con la aplicación detenida: npm run db:restore -- ruta-del-respaldo.sqlite --confirm",
  );
  process.exit(1);
}
const running = await new Promise((resolve) => {
  const socket = net.createConnection({
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 5173),
  });
  socket.once("connect", () => {
    socket.destroy();
    resolve(true);
  });
  socket.once("error", () => resolve(false));
});
if (running)
  throw new Error(
    "Detén la aplicación antes de restaurar. El puerto local sigue en uso.",
  );
const source = path.resolve(sourceArg),
  destination = path.resolve(process.env.SIGESHRL_DB ?? "data/sigeshrl.sqlite");
if (source === destination)
  throw new Error(
    "Selecciona un archivo de respaldo distinto de la base actual.",
  );
const check = new DatabaseSync(source, { readOnly: true });
try {
  if (check.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
    throw new Error("El respaldo no superó la verificación de integridad.");
  if (
    !check.prepare("SELECT value FROM demo_meta WHERE key='seed_version'").get()
  )
    throw new Error("El archivo no corresponde a SIGESHRL.");
} finally {
  check.close();
}
await mkdir(path.dirname(destination), { recursive: true });
await mkdir("backups", { recursive: true });
try {
  await access(destination);
  const current = new DatabaseSync(destination);
  try {
    await backup(
      current,
      path.resolve("backups", `antes-de-restaurar-${Date.now()}.sqlite`),
    );
  } finally {
    current.close();
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
// Solo se eliminan los archivos auxiliares de la base de destino explícita y con el servidor detenido.
for (const suffix of ["-wal", "-shm"])
  try {
    await unlink(destination + suffix);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
await copyFile(source, destination);
const restored = new DatabaseSync(destination);
try {
  restored.exec("DELETE FROM sessions;");
} finally {
  restored.close();
}
console.log("Restauración completada. Las sesiones anteriores se cerraron.");
