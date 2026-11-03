import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { findBundledRipgrep, findVscodeBuiltinRipgrep } from "../../ripgrepPath";

describe("findBundledRipgrep", () => {
  it("encuentra el binario de la plataforma actual en node_modules", () => {
    const rg = findBundledRipgrep();
    assert.ok(rg, `esperaba encontrar @vscode/ripgrep-${process.platform}-${process.arch}`);
    assert.ok(fs.existsSync(rg!));
  });

  it("devuelve undefined si no hay paquete para la plataforma", () => {
    assert.strictEqual(findBundledRipgrep("aix", "ppc64"), undefined);
  });
});

describe("findVscodeBuiltinRipgrep", () => {
  let appRoot: string;

  beforeEach(() => {
    appRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hypersearch-approot-"));
  });

  afterEach(() => {
    fs.rmSync(appRoot, { recursive: true, force: true });
  });

  function touch(...segments: string[]): string {
    const file = path.join(appRoot, ...segments);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "");
    return file;
  }

  it("encuentra el layout ripgrep-universal de VS Code reciente", () => {
    const rg = touch("node_modules.asar.unpacked", "@vscode", "ripgrep-universal", "bin", "linux-x64", "rg");
    assert.strictEqual(findVscodeBuiltinRipgrep(appRoot, "linux", "x64"), rg);
  });

  it("encuentra el layout @vscode/ripgrep de versiones anteriores y de VS Code Server", () => {
    const rg = touch("node_modules", "@vscode", "ripgrep", "bin", "rg.exe");
    assert.strictEqual(findVscodeBuiltinRipgrep(appRoot, "win32", "x64"), rg);
  });

  it("no confunde el binario de otra plataforma", () => {
    touch("node_modules.asar.unpacked", "@vscode", "ripgrep-universal", "bin", "linux-x64", "rg");
    assert.strictEqual(findVscodeBuiltinRipgrep(appRoot, "darwin", "arm64"), undefined);
  });

  it("devuelve undefined sin appRoot o si no hay ripgrep", () => {
    assert.strictEqual(findVscodeBuiltinRipgrep(undefined), undefined);
    assert.strictEqual(findVscodeBuiltinRipgrep(appRoot), undefined);
  });
});
