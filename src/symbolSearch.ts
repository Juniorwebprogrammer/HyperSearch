import * as vscode from "vscode";

/** Símbolos del workspace que matchean `query`, vía el/los language server(s) activos. */
export async function searchWorkspaceSymbols(
  query: string
): Promise<vscode.SymbolInformation[]> {
  if (query.trim().length === 0) {
    return [];
  }
  const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
    "vscode.executeWorkspaceSymbolProvider",
    query
  );
  return symbols ?? [];
}

/**
 * Implementaciones de un símbolo dado (equivalente a Ctrl+Alt+B / "Go to Implementation"
 * en IntelliJ), delegando en el language server activo para ese lenguaje.
 */
export async function findImplementations(
  uri: vscode.Uri,
  position: vscode.Position
): Promise<vscode.Location[]> {
  const result = await vscode.commands.executeCommand<
    (vscode.Location | vscode.LocationLink)[]
  >("vscode.executeImplementationProvider", uri, position);

  if (!result) {
    return [];
  }

  return result.map((item) =>
    isLocationLink(item)
      ? new vscode.Location(item.targetUri, item.targetRange)
      : item
  );
}

function isLocationLink(
  item: vscode.Location | vscode.LocationLink
): item is vscode.LocationLink {
  return (item as vscode.LocationLink).targetUri !== undefined;
}
