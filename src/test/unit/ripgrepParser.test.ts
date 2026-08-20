import * as assert from "assert";
import { parseRipgrepLine, parseRipgrepOutput } from "../../ripgrepParser";

describe("parseRipgrepLine", () => {
  it("parsea una línea simple path:line:col:text", () => {
    const result = parseRipgrepLine("src/extension.ts:12:5:  const foo = 1;");
    assert.deepStrictEqual(result, {
      file: "src/extension.ts",
      line: 12,
      column: 5,
      text: "  const foo = 1;",
    });
  });

  it("devuelve null para una línea vacía", () => {
    assert.strictEqual(parseRipgrepLine(""), null);
    assert.strictEqual(parseRipgrepLine("   "), null);
  });

  it("devuelve null si no matchea el formato vimgrep", () => {
    assert.strictEqual(parseRipgrepLine("esto no es una línea de ripgrep"), null);
  });

  it("maneja rutas de Windows con drive letter sin confundir los ':' ", () => {
    const result = parseRipgrepLine("C:\\proj\\src\\index.ts:3:1:import x from 'y';");
    assert.ok(result);
    assert.strictEqual(result!.file, "C:\\proj\\src\\index.ts");
    assert.strictEqual(result!.line, 3);
    assert.strictEqual(result!.column, 1);
  });

  it("maneja texto coincidente que contiene ':' sin romper el parseo", () => {
    const result = parseRipgrepLine("src/config.ts:7:10:const url = 'http://x:8080';");
    assert.ok(result);
    assert.strictEqual(result!.line, 7);
    assert.strictEqual(result!.column, 10);
    assert.strictEqual(result!.text, "const url = 'http://x:8080';");
  });
});

describe("parseRipgrepOutput", () => {
  it("parsea múltiples líneas e ignora las que no matchean", () => {
    const stdout = [
      "src/a.ts:1:1:foo",
      "",
      "src/b.ts:2:3:bar",
      "línea corrupta sin formato",
    ].join("\n");
    const result = parseRipgrepOutput(stdout);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].file, "src/a.ts");
    assert.strictEqual(result[1].file, "src/b.ts");
  });

  it("devuelve array vacío para stdout vacío", () => {
    assert.deepStrictEqual(parseRipgrepOutput(""), []);
  });
});
