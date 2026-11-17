import { build } from "esbuild";
import { mkdir, copyFile, writeFile, readFile, cp } from "node:fs/promises";
await mkdir("dist/client/assets", { recursive: true });
await cp("public", "dist/client", { recursive: true });
await build({
  entryPoints: { app: "src/main.tsx" },
  outdir: "dist/client/assets",
  bundle: true,
  format: "esm",
  splitting: true,
  platform: "browser",
  target: "es2022",
  minify: true,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const html = (await readFile("index.html", "utf8")).replace(
  '<script type="module" src="/src/main.tsx"></script>',
  '<link rel="stylesheet" href="/assets/app.css"/><script type="module" src="/assets/app.js"></script>',
);
await writeFile("dist/client/index.html", html);
await mkdir("dist/server", { recursive: true });
await mkdir("dist/local", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await build({
  entryPoints: ["server/worker.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
await build({
  entryPoints: ["server/local.ts"],
  outfile: "dist/local/server.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  packages: "external",
});
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await writeFile(
  "dist/server/wrangler.json",
  JSON.stringify({
    main: "index.js",
    compatibility_date: "2026-05-15",
    assets: {
      directory: "../client",
      binding: "ASSETS",
      not_found_handling: "single-page-application",
    },
    d1_databases: [
      {
        binding: "DB",
        database_name: "sigeshrl",
        database_id: "00000000-0000-4000-8000-000000000000",
      },
    ],
  }),
);
console.log("Aplicación compilada para ejecución local y servidor web.");
