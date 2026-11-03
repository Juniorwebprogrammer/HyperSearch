import * as assert from "assert";
import * as vscode from "vscode";

suite("HyperSearch - integración", () => {
  test("la extensión se activa y registra el comando hyperSearch.open", async () => {
    // No hardcodeamos "<publisher>.hyper-search": buscamos por el "name" del
    // package.json, que no depende del publisher (ya cambió una vez, del
    // placeholder a turinconconnect).
    const ext = vscode.extensions.all.find((e) => e.packageJSON?.name === "hyper-search");
    assert.ok(ext, "la extensión debería estar instalada en el host de pruebas");

    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("hyperSearch.open"),
      "el comando hyperSearch.open debería estar registrado"
    );
  });

  test("ejecutar el comando revela la vista HyperSearch en el sidebar sin lanzar errores", async () => {
    // No hay forma pública de inspeccionar el contenido del WebviewView,
    // pero al menos confirmamos que el comando corre de punta a punta sin
    // excepciones. A diferencia del panel modal anterior, la vista queda
    // anclada en el sidebar — no hay nada que cerrar después.
    await vscode.commands.executeCommand("hyperSearch.open");
  });
});
