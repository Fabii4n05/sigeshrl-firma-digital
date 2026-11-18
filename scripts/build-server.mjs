import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("dist/local", { recursive: true });
await build({
  entryPoints: ["server/local.ts"],
  outfile: "dist/local/server.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  packages: "external",
});
console.log("Servidor local preparado.");
