import * as vscode from "vscode";
import { buildExcludeGlobPattern } from "./excludeGlobs";

/**
 * Devuelve todos los archivos del workspace, excluyendo los globs configurados
 * (node_modules, .git, dist, etc). No aplica aún el filtro de texto de la query:
 * eso lo hace fuzzyFilterSort sobre el resultado, para poder reusar el listado
 * mientras el usuario sigue tecleando.
 */
export async function listWorkspaceFiles(
  excludeGlobs: readonly string[],
  hardCap = 5000
): Promise<vscode.Uri[]> {
  const exclude = buildExcludeGlobPattern(excludeGlobs);
  return vscode.workspace.findFiles("**/*", exclude, hardCap);
}

export function toWorkspaceRelativePath(uri: vscode.Uri): string {
  return vscode.workspace.asRelativePath(uri, false);
}
