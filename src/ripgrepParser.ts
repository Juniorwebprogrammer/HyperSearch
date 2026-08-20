export interface RipgrepMatch {
  /** Ruta tal cual la reporta ripgrep (relativa al cwd con el que se ejecutó). */
  file: string;
  /** Línea 1-based, como la reporta ripgrep. */
  line: number;
  /** Columna 1-based, como la reporta ripgrep. */
  column: number;
  /** Contenido completo de la línea coincidente. */
  text: string;
}

// Formato de salida de `rg --vimgrep`: path:line:col:text
// El primer grupo es greedy a propósito: así el regex hace backtracking
// y ancla line/col al ÚLTIMO ":<num>:<num>:" de la línea, que es el real,
// incluso si el path contiene ":" (drive letters de Windows) o el texto
// coincidente contiene ":".
const VIMGREP_LINE = /^(.+):(\d+):(\d+):(.*)$/s;

/** Parsea una línea de salida `rg --vimgrep`. Devuelve null si no matchea el formato. */
export function parseRipgrepLine(line: string): RipgrepMatch | null {
  if (line.trim().length === 0) {
    return null;
  }
  const m = VIMGREP_LINE.exec(line);
  if (!m) {
    return null;
  }
  const [, file, lineStr, colStr, text] = m;
  const lineNum = Number.parseInt(lineStr, 10);
  const colNum = Number.parseInt(colStr, 10);
  if (Number.isNaN(lineNum) || Number.isNaN(colNum)) {
    return null;
  }
  return { file, line: lineNum, column: colNum, text };
}

/** Parsea un bloque completo de stdout (múltiples líneas) de `rg --vimgrep`. */
export function parseRipgrepOutput(stdout: string): RipgrepMatch[] {
  const matches: RipgrepMatch[] = [];
  for (const line of stdout.split("\n")) {
    const parsed = parseRipgrepLine(line);
    if (parsed) {
      matches.push(parsed);
    }
  }
  return matches;
}
