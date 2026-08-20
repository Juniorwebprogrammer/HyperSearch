import * as assert from "assert";
import {
  buildExcludeGlobSet,
  buildExcludeGlobPattern,
  buildRipgrepExcludeArgs,
  DEFAULT_EXCLUDE_GLOBS,
} from "../../excludeGlobs";

describe("buildExcludeGlobSet", () => {
  it("incluye siempre los globs por defecto", () => {
    const set = buildExcludeGlobSet([]);
    for (const g of DEFAULT_EXCLUDE_GLOBS) {
      assert.ok(set.includes(g), `esperaba encontrar ${g}`);
    }
  });

  it("añade los globs adicionales del usuario", () => {
    const set = buildExcludeGlobSet(["**/vendor/**"]);
    assert.ok(set.includes("**/vendor/**"));
  });

  it("deduplica si el usuario repite un glob por defecto", () => {
    const set = buildExcludeGlobSet(["**/node_modules/**", "**/node_modules/**"]);
    const occurrences = set.filter((g) => g === "**/node_modules/**").length;
    assert.strictEqual(occurrences, 1);
  });

  it("ignora entradas vacías o solo espacios", () => {
    const set = buildExcludeGlobSet(["   ", ""]);
    assert.strictEqual(set.length, DEFAULT_EXCLUDE_GLOBS.length);
  });
});

describe("buildExcludeGlobPattern", () => {
  it("produce un patrón envuelto en llaves separado por comas", () => {
    const pattern = buildExcludeGlobPattern(["**/vendor/**"]);
    assert.match(pattern, /^\{.*\}$/);
    assert.ok(pattern.includes("**/vendor/**"));
    assert.ok(pattern.includes("**/node_modules/**"));
  });
});

describe("buildRipgrepExcludeArgs", () => {
  it("genera un par --glob '!patron' por cada exclude", () => {
    const args = buildRipgrepExcludeArgs([]);
    // cada glob por defecto aporta 2 elementos: '--glob' y '!patron'
    assert.strictEqual(args.length, DEFAULT_EXCLUDE_GLOBS.length * 2);
    assert.ok(args.includes("--glob"));
    assert.ok(args.includes("!**/node_modules/**"));
  });
});
