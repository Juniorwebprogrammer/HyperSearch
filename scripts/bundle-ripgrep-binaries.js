// Instala en node_modules los binarios de ripgrep de TODAS las plataformas de
// VS Code de escritorio, para que `vsce package` los meta en el .vsix.
//
// Por qué hace falta: @vscode/ripgrep trae el binario como optionalDependency
// por plataforma (@vscode/ripgrep-win32-x64, -darwin-arm64, ...) y npm solo
// instala el de la máquina donde se corre `npm install`. VS Code NO ejecuta npm
// al instalar una extensión: el .vsix lleva tal cual lo que había en
// node_modules. Sin este paso, un .vsix empaquetado en Linux no trae rg.exe y
// en Windows no hay con qué buscar texto.
//
// Corre solo, desde `vscode:prepublish` (vsce package / vsce publish).

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/** `${process.platform}-${process.arch}` de cada plataforma soportada. */
const TARGETS = ["win32-x64", "win32-arm64", "darwin-x64", "darwin-arm64", "linux-x64", "linux-arm64", "linux-arm"];

const root = path.resolve(__dirname, "..");
const ripgrepPkg = JSON.parse(
  fs.readFileSync(path.join(root, "node_modules", "@vscode", "ripgrep", "package.json"), "utf8")
);

// Misma versión exacta que declara el @vscode/ripgrep instalado, así no se
// desincronizan al actualizarlo.
const specs = TARGETS.map((target) => {
  const name = `@vscode/ripgrep-${target}`;
  const version = ripgrepPkg.optionalDependencies && ripgrepPkg.optionalDependencies[name];
  if (!version) {
    console.error(`@vscode/ripgrep@${ripgrepPkg.version} no declara ${name} como optionalDependency.`);
    process.exit(1);
  }
  return `${name}@${version}`;
});

// --force: saltea el chequeo de os/cpu (sin él npm se niega a instalar el
// binario de otra plataforma). --no-save: no toca package.json ni el lockfile.
execSync(`npm install --no-save --force --no-audit --no-fund --loglevel=error ${specs.join(" ")}`, {
  cwd: root,
  stdio: "inherit",
});

const missing = TARGETS.filter((target) => {
  const bin = target.startsWith("win32") ? "rg.exe" : "rg";
  return !fs.existsSync(path.join(root, "node_modules", "@vscode", `ripgrep-${target}`, "bin", bin));
});
if (missing.length > 0) {
  console.error(`Faltan binarios de ripgrep para: ${missing.join(", ")}. No se empaqueta un .vsix incompleto.`);
  process.exit(1);
}
console.log(`ripgrep incluido para: ${TARGETS.join(", ")}`);
