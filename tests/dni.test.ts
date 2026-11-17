import test from "node:test";
import assert from "node:assert/strict";
import { parseDni } from "../src/dni";
test("El DNI impreso conserva los ceros iniciales", () =>
  assert.equal(parseDni("DNI\n00000014\nPACIENTE").dni, "00000014"));
test("Un dígito verificador separado no se incorpora al DNI", () =>
  assert.equal(parseDni("DNI 12345678 - 9").dni, "12345678"));
test("La lectura TD1 reconoce el código peruano", () =>
  assert.equal(parseDni("I<PER123456789<<<<<<<<<<<<<<<").dni, "12345678"));
test("Una lectura ambigua conserva las alternativas para revisión humana", () =>
  assert.deepEqual(parseDni("DNI 00000014\nTelefono 99999999").candidates, [
    "00000014",
    "99999999",
  ]));
test("Una fecha o una cadena de nueve dígitos sin etiqueta no se toma por DNI", () => {
  assert.equal(parseDni("1988-06-15 123456789").dni, "");
  assert.equal(parseDni("SIN DOCUMENTO LEGIBLE").dni, "");
});
