import * as fs from "fs";
import * as path from "path";

function binaryName(platform: NodeJS.Platform): string {
  return platform === "win32" ? "rg.exe" : "rg";
}

/**
 * Ruta al binario de ripgrep empaquetado dentro del .vsix
 * (`@vscode/ripgrep-<plataforma>-<arch>`), o undefined si el paquete no trae
 * el de esta plataforma.
 *
 * No se importa `@vscode/ripgrep` a propósito: desde la 1.18 es un módulo
 * solo-ESM que lanza un error al cargarse si falta el binario de la
 * plataforma, y en un VS Code con Node viejo `require()` de un módulo ESM
 * falla con ERR_REQUIRE_ESM. En ambos casos extension.js no llegaba a cargar
 * y la extensión entera no arrancaba, no solo la búsqueda de texto.
 */
export function findBundledRipgrep(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string | undefined {
  try {
    return require.resolve(`@vscode/ripgrep-${platform}-${arch}/bin/${binaryName(platform)}`);
  } catch {
    return undefined;
  }
}

/**
 * Ruta al ripgrep que trae el propio VS Code (el de su búsqueda nativa), como
 * respaldo si el .vsix no incluye el binario de esta plataforma. No es API
 * pública y su ubicación cambió entre versiones, así que se prueban las
 * conocidas en orden.
 */
export function findVscodeBuiltinRipgrep(
  appRoot: string | undefined,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string | undefined {
  if (!appRoot) {
    return undefined;
  }
  const bin = binaryName(platform);
  const candidates: string[] = [];
  for (const modulesDir of ["node_modules.asar.unpacked", "node_modules"]) {
    candidates.push(
      // VS Code reciente (p.ej. 1.142): un binario por plataforma en ripgrep-universal.
      path.join(appRoot, modulesDir, "@vscode", "ripgrep-universal", "bin", `${platform}-${arch}`, bin),
      // VS Code anterior y VS Code Server (remotos SSH/WSL/Codespaces).
      path.join(appRoot, modulesDir, "@vscode", "ripgrep", "bin", bin)
    );
  }
  return candidates.find((candidate) => fs.existsSync(candidate));
}

/**
 * Un .vsix empaquetado desde Windows no guarda el bit de ejecución, así que en
 * Linux/macOS el binario puede llegar sin él (spawn fallaría con EACCES). En
 * ese caso se intenta darle permisos; devuelve false si no se pudo.
 */
function ensureExecutable(file: string): boolean {
  if (process.platform === "win32") {
    return true;
  }
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    // Sin permiso de ejecución: se intenta corregir abajo.
  }
  try {
    fs.chmodSync(file, 0o755);
    return true;
  } catch {
    return false;
  }
}

let cachedRipgrepPath: string | null | undefined;

/**
 * Binario de ripgrep a usar: el empaquetado en la extensión y, si falta, el
 * del propio VS Code. undefined si no hay ninguno. El resultado (también el
 * negativo) se cachea durante toda la sesión.
 */
export function getRipgrepPath(vscodeAppRoot: string | undefined): string | undefined {
  if (cachedRipgrepPath === undefined) {
    const bundled = findBundledRipgrep();
    cachedRipgrepPath =
      (bundled && ensureExecutable(bundled) ? bundled : undefined) ??
      findVscodeBuiltinRipgrep(vscodeAppRoot) ??
      null;
  }
  return cachedRipgrepPath ?? undefined;
}
