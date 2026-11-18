import test from "node:test";
import assert from "node:assert/strict";
import { parseScannedDni } from "../src/lib/scanner.js";

test("El lector reconoce entradas de un escáner y conserva ceros iniciales", () => {
  for (const code of [
    "00000014",
    "DNI=00000014",
    "SIGESHRL-DEMO;DNI=00000014",
    '{"numeroDocumento":"00000014"}',
    "https://ejemplo.test/verificar?dni=00000014",
  ]) {
    assert.equal(parseScannedDni(code).dni, "00000014", code);
  }
});
test("Un código desconocido o un número dentro de una URL no se trata como DNI", () => {
  for (const code of [
    "https://ejemplo.test/00000014",
    "abc00000014xyz",
    "2026-11-17",
    "0123456789",
    "",
  ])
    assert.equal(parseScannedDni(code).dni, "", code);
});
