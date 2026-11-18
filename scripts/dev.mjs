import { spawn } from "node:child_process";
const api = spawn(
  process.execPath,
  ["--import", "tsx", "--watch", "server/local.ts"],
  { stdio: "inherit", env: { ...process.env, PORT: "3001" } },
);
const web = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
  stdio: "inherit",
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  web.kill();
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
for (const child of [api, web]) child.on("exit", (code) => stop(code ?? 0));
