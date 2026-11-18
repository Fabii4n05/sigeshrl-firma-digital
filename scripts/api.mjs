import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--watch", "server/local.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PORT ?? "3001" },
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
