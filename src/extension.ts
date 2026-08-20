import * as vscode from "vscode";
import { HyperSearchViewProvider } from "./hyperSearchView";

export function activate(context: vscode.ExtensionContext): void {
  HyperSearchViewProvider.register(context);

  const disposable = vscode.commands.registerCommand("hyperSearch.open", () => {
    void HyperSearchViewProvider.reveal();
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Nada que limpiar: el WebviewViewProvider se registra vía
  // context.subscriptions, que VS Code libera automáticamente.
}
