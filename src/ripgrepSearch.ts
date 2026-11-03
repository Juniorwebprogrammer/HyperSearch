import * as cp from "child_process";
import * as readline from "readline";
import { buildRipgrepExcludeArgs } from "./excludeGlobs";
import { parseRipgrepLine, RipgrepMatch } from "./ripgrepParser";

export interface RipgrepSearchOptions {
  /** Ejecutable de ripgrep a usar (ver getRipgrepPath en ripgrepPath.ts). */
  rgPath: string;
  cwd: string;
  query: string;
  excludeGlobs: readonly string[];
  maxResults: number;
  /**
   * Rutas relativas a `cwd` a las que restringir la búsqueda (para los scopes
   * "archivo actual" / "pestañas abiertas" / "cambios de git"). Si se omite,
   * busca en todo `cwd`. Si se da un array VACÍO, no ejecuta ripgrep en
   * absoluto (el scope no tiene ningún archivo que buscar).
   */
  onlyPaths?: readonly string[];
  /** Trata `query` como regex en vez de texto literal. Default: false. */
  regex?: boolean;
  /** Fuerza sensibilidad a mayúsculas/minúsculas. Default: false (usa --smart-case). */
  caseSensitive?: boolean;
  /** Solo coincidencias de palabra completa. Default: false. */
  wholeWord?: boolean;
}

/**
 * Ejecuta ripgrep sobre `cwd` (o sobre `onlyPaths` si se indica) buscando
 * `query`, excluyendo los globs indicados. Devuelve como máximo `maxResults`
 * coincidencias.
 *
 * Lee la salida de ripgrep línea por línea y CORTA el proceso apenas junta
 * `maxResults` matches, en vez de esperar a que termine y bufferear todo su
 * stdout: en proyectos grandes (p.ej. un proyecto Flutter, con miles de
 * archivos y bastante código generado) esa salida completa puede superar
 * fácilmente el límite de buffer de Node (el clásico
 * "stdout maxBuffer length exceeded"), y además es trabajo desperdiciado si
 * de todas formas se iba a descartar casi todo al recortar a maxResults.
 */
export function searchWithRipgrep(options: RipgrepSearchOptions): Promise<RipgrepMatch[]> {
  const { rgPath, cwd, query, excludeGlobs, maxResults, onlyPaths, regex, caseSensitive, wholeWord } = options;

  if (query.trim().length === 0) {
    return Promise.resolve([]);
  }
  if (onlyPaths && onlyPaths.length === 0) {
    // El scope activo no incluye ningún archivo (p.ej. no hay pestañas abiertas
    // o no hay cambios de git): no tiene sentido lanzar ripgrep sobre todo `cwd`.
    return Promise.resolve([]);
  }
  if (maxResults <= 0) {
    return Promise.resolve([]);
  }

  const args = [
    "--vimgrep",
    caseSensitive ? "--case-sensitive" : "--smart-case",
    ...(regex ? [] : ["--fixed-strings"]),
    ...(wholeWord ? ["--word-regexp"] : []),
    "--max-count",
    "200",
    ...buildRipgrepExcludeArgs(excludeGlobs),
    "--",
    query,
    ...(onlyPaths && onlyPaths.length > 0 ? onlyPaths : ["."]),
  ];

  return new Promise((resolve, reject) => {
    const proc = cp.spawn(rgPath, args, { cwd });
    const matches: RipgrepMatch[] = [];
    let stderr = "";
    let settled = false;
    let stoppedEarly = false;

    const rl = readline.createInterface({ input: proc.stdout });

    const finish = (err?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      rl.close();
      if (err) {
        reject(err);
      } else {
        resolve(matches);
      }
    };

    rl.on("line", (line) => {
      if (settled) {
        return;
      }
      const parsed = parseRipgrepLine(line);
      if (!parsed) {
        return;
      }
      matches.push(parsed);
      if (matches.length >= maxResults) {
        stoppedEarly = true;
        proc.kill(); // Ya tenemos lo que necesitamos; no hace falta que rg siga escaneando.
        finish();
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      // Cap defensivo: alcanza y sobra para un mensaje de error legible,
      // sin arriesgarse a acumular salida sin límite.
      if (stderr.length < 4096) {
        stderr += chunk.toString();
      }
    });

    proc.on("error", (err) => finish(err));

    proc.on("close", (code) => {
      if (settled) {
        return;
      }
      // code === 1 → rg terminó sin matches: no es un error real.
      if (code !== null && code !== 0 && code !== 1) {
        finish(new Error(stderr.trim() || `ripgrep salió con código ${code}`));
        return;
      }
      finish();
    });
  });
}
