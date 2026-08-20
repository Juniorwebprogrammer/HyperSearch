import * as assert from "assert";
import { fuzzyScore, fuzzyFilterSort } from "../../fuzzyMatch";

describe("fuzzyScore", () => {
  it("devuelve 0 para query vacía", () => {
    assert.strictEqual(fuzzyScore("", "anything.ts"), 0);
  });

  it("devuelve null si target está vacío y query no", () => {
    assert.strictEqual(fuzzyScore("abc", ""), null);
  });

  it("devuelve null si la query no es subsecuencia del target", () => {
    assert.strictEqual(fuzzyScore("xyz", "extension.ts"), null);
  });

  it("matchea subsecuencias no contiguas (case-insensitive)", () => {
    assert.notStrictEqual(fuzzyScore("ext", "EXTENSION.TS"), null);
    assert.notStrictEqual(fuzzyScore("etn", "extension.ts"), null);
  });

  it("puntúa más alto un match contiguo que uno disperso", () => {
    const contiguous = fuzzyScore("ext", "extension.ts");
    const scattered = fuzzyScore("ext", "e-x-tension.ts");
    assert.ok(contiguous !== null && scattered !== null);
    assert.ok((contiguous as number) > (scattered as number));
  });

  it("puntúa más alto un match al inicio de palabra tras separador", () => {
    const wordStart = fuzzyScore("comp", "src/components/button.ts");
    const midWord = fuzzyScore("mpon", "src/components/button.ts");
    assert.ok(wordStart !== null && midWord !== null);
    assert.ok((wordStart as number) > (midWord as number));
  });
});

describe("fuzzyFilterSort", () => {
  const items = [
    "src/extension.ts",
    "src/components/button.tsx",
    "src/components/index.ts",
    "README.md",
  ];

  it("filtra los que no matchean y respeta maxResults", () => {
    const result = fuzzyFilterSort("comp", items, (s) => s, 1);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("components"));
  });

  it("query vacía devuelve todo (hasta maxResults) sin descartar nada", () => {
    const result = fuzzyFilterSort("", items, (s) => s, 10);
    assert.strictEqual(result.length, items.length);
  });

  it("no incluye items que no matchean en absoluto", () => {
    const result = fuzzyFilterSort("zzz", items, (s) => s, 10);
    assert.strictEqual(result.length, 0);
  });
});
