import { spawn } from "node:child_process";
import { context } from "esbuild";
await import("./build.mjs");
const browser = await context({
  entryPoints: { app: "src/main.tsx" },
  outdir: "dist/client/assets",
  bundle: true,
  format: "esm",
  splitting: true,
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
});
await browser.watch();
const server = spawn(
  process.execPath,
  ["--import", "tsx", "--watch", "server/local.ts"],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    server.kill();
    await browser.dispose();
    process.exit();
  });
server.on("exit", async (code) => {
  await browser.dispose();
  process.exit(code ?? 0);
});
