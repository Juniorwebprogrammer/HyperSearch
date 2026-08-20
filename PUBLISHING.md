# Cómo publicar esta extensión en el Marketplace de VS Code

Guía paso a paso, de cero, hasta tener `hyper-search` instalable desde
el Marketplace. No forma parte del paquete publicado (está en `.vscodeignore`).

## 1. Conseguir un publisher id

Un "publisher" es tu identidad de editor en el Marketplace — un id único
(minúsculas, números, guiones) que va en el campo `"publisher"` de
`package.json`. Si ya tenés uno, saltá al paso 3.

1. Entrá a https://marketplace.visualstudio.com/manage y logueate con una
   cuenta Microsoft (la misma que uses para Azure DevOps).
2. Click en **Create Publisher**. Elegí un id (ej. `tu-nombre` o el nombre de
   tu org) — **no se puede cambiar después** — y un nombre para mostrar.

## 2. Conseguir un Personal Access Token (PAT)

vsce necesita un PAT de Azure DevOps con permiso de Marketplace para poder
publicar en tu nombre:

1. Entrá a https://dev.azure.com, logueate con la misma cuenta.
2. Arriba a la derecha → **User settings** → **Personal access tokens** →
   **New Token**.
3. **Organization**: "All accessible organizations". **Scopes**: buscá
   "Marketplace" y marcá **Manage**.
4. Copiá el token generado — no se puede volver a ver después de cerrar la
   pantalla.

## 3. Configurar el proyecto con tu publisher id

Editá `package.json`:

```jsonc
{
  "publisher": "tu-publisher-id" // reemplazá el placeholder REPLACE-WITH-YOUR-PUBLISHER-ID
}
```

Opcional pero recomendado antes de publicar:

- **`repository`**: si el código vive en GitHub/GitLab, agregá
  `"repository": { "type": "git", "url": "https://github.com/tu-usuario/hyper-search" }`
  — el Marketplace muestra el link y lo usa para "Report Issue". Todavía no
  hay uno configurado (el proyecto ni siquiera tiene git local por ahora).
- **`license`** + `LICENSE`: ya está — Apache 2.0, en `package.json` y en el
  archivo `LICENSE` de la raíz. Ojo: el `LICENSE` tiene un placeholder
  `[REEMPLAZAR CON TU NOMBRE O EL DE TU ORGANIZACIÓN]` en la línea de
  copyright — completalo antes de publicar.
- **Icono del Marketplace**: ya está — `"icon": "media/marketplace-icon.png"`,
  128×128 a color (tile teal con el glyph de radar). El icono de la activity
  bar (`media/hypersearch-icon.svg`) es un archivo distinto — ese lo
  recolorea VS Code según el tema, así que se mantiene monocromo a propósito.

## 4. Loguearte con vsce

```bash
npx vsce login tu-publisher-id
```

Te va a pedir el PAT del paso 2. Alternativa sin prompt interactivo (útil en
CI): variable de entorno `VSCE_PAT=<token>`.

## 5. Empaquetar y probar localmente ANTES de publicar

```bash
npm run package
```

Esto corre `vsce package`, que compila (`vscode:prepublish` → `npm run
compile`) y genera un `.vsix` en la raíz del proyecto. Instalalo en tu propio
VS Code para probarlo tal cual lo instalaría cualquiera:

```bash
code --install-extension hyper-search-0.1.0.vsix
```

Revisá que el icono de la activity bar se vea bien, que el comando
`hyperSearch.open` funcione, y que la descripción/README se vean bien
(podés previsualizar el README renderizado abriendo el `.vsix` con
`vsce show` o simplemente leyéndolo, ya que el Marketplace lo renderiza tal
cual).

## 6. Publicar

```bash
npm run publish
```

Corre `vsce publish`, que sube la versión actual de `package.json`. Para
publicar bajo un número de versión distinto sin editar `package.json` a
mano, usá directamente vsce con un bump automático:

```bash
npx vsce publish patch   # 0.1.0 -> 0.1.1
npx vsce publish minor   # 0.1.0 -> 0.2.0
npx vsce publish major   # 0.1.0 -> 1.0.0
```

## 7. Cada release siguiente

1. Sumá una entrada nueva arriba de todo en `CHANGELOG.md`.
2. `npm run package` y probá el `.vsix` generado.
3. `npm run publish` (o `vsce publish <patch|minor|major>`).

## Notas

- `vsce package`/`publish` corren `npm run vscode:prepublish` (→ `npm run
  compile`) automáticamente antes de armar el paquete — no hace falta
  compilar a mano primero.
- El `.vsix` generado queda en la raíz del proyecto; está en `.gitignore` y
  en `.vscodeignore` (no se empaqueta a sí mismo ni se versiona por
  accidente).
- Si algún día el proyecto pasa a tener control de versiones con git, `vsce`
  también sabe leer el `CHANGELOG.md`/tags, pero nada de esto depende de que
  el repo tenga git — se puede empaquetar y publicar igual sin él.
