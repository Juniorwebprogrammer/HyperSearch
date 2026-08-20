// NOTA: si tocás esta lista, actualizá también el "default" de
// hyperSearch.excludeGlobs en package.json — es la misma lista
// duplicada a mano para que la UI de Settings muestre lo que realmente se
// aplica (package.json es JSON estático, no puede importar de acá).
export const DEFAULT_EXCLUDE_GLOBS: readonly string[] = [
  // Node.js
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/out/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",

  // Flutter / Dart / apps móviles (iOS y Android nativos por debajo de Flutter
  // o React Native, que comparten estas mismas carpetas de dependencias).
  "**/.dart_tool/**",
  "**/.pub-cache/**",
  "**/ios/Pods/**",
  "**/ios/.symlinks/**",
  "**/DerivedData/**",

  // Java / Kotlin / Android (Gradle) y Maven.
  "**/.gradle/**",
  "**/target/**",

  // .NET / C#.
  "**/bin/**",
  "**/obj/**",
  "**/packages/**",
  "**/.vs/**",

  // Python.
  "**/venv/**",
  "**/.venv/**",
  "**/__pycache__/**",
  "**/.tox/**",

  // PHP (Composer) / Go (modules vendorizados) / Ruby (Bundler).
  "**/vendor/**",
  "**/.bundle/**",

  // Swift (Swift Package Manager).
  "**/.build/**",
];

/**
 * Combina los globs por defecto con los que el usuario añada en settings,
 * deduplica y produce un único patrón glob "{a,b,c}" listo para
 * vscode.workspace.findFiles(include, exclude) o para pasarlo a ripgrep
 * como una lista de --glob '!patron'.
 */
export function buildExcludeGlobSet(userGlobs: readonly string[]): string[] {
  const set = new Set<string>();
  for (const g of DEFAULT_EXCLUDE_GLOBS) {
    if (g.trim().length > 0) {
      set.add(g.trim());
    }
  }
  for (const g of userGlobs) {
    if (g && g.trim().length > 0) {
      set.add(g.trim());
    }
  }
  return Array.from(set);
}

/** Versión "{a,b,c}" combinada, para usarla como segundo argumento de findFiles. */
export function buildExcludeGlobPattern(userGlobs: readonly string[]): string {
  const globs = buildExcludeGlobSet(userGlobs);
  return `{${globs.join(",")}}`;
}

/** Convierte el set de globs a flags `--glob '!patron'` para ripgrep. */
export function buildRipgrepExcludeArgs(userGlobs: readonly string[]): string[] {
  const globs = buildExcludeGlobSet(userGlobs);
  const args: string[] = [];
  for (const g of globs) {
    args.push("--glob", `!${g}`);
  }
  return args;
}
