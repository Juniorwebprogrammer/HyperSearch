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

> **Ojo: los PAT globales ("All accessible organizations") de Azure DevOps se
> retiran el 1 de diciembre de 2026.** Hasta esa fecha este camino funciona;
> después hay que publicar con GitHub Actions + Trusted Publishing
> (`vsce publish --oidc`, requiere `@vscode/vsce` 4.x) o con Microsoft Entra
> ID (`vsce publish --azure-credential`). Ver la sección "Publishing
> extensions" de la documentación oficial:
> https://code.visualstudio.com/api/working-with-extensions/publishing-extension

## 3. Configurar el proyecto con tu publisher id

Ya está: `package.json` tiene `"publisher": "Turincnweb"` (display name "Tu
rincón web"), el mismo publisher con el que se publicó la 0.1.0 en el
Marketplace, así que el ID de la extensión es `Turincnweb.hyper-search`. El
`.vsix` 0.1.1 de GitHub se empaquetó con el placeholder
`REPLACE-WITH-YOUR-PUBLISHER-ID`; quien lo tenga instalado tiene que
desinstalarlo, porque VS Code lo trata como otra extensión distinta.

> **Publicar sin token**: en vez de los pasos 2, 4 y 6, se puede subir el
> `.vsix` desde la web. Entrá a
> https://marketplace.visualstudio.com/manage/publishers/turincnweb, en la
> fila de HyperSearch abrí el menú `···` → **Update** y arrastrá el `.vsix`
> generado con `npm run package`. La versión tiene que ser mayor que la
> publicada y el publisher del `.vsix` tiene que ser `Turincnweb`. Sigue
> funcionando después del retiro de los PAT globales.

Además:

- **`repository`**: ya está — apunta a
  `https://github.com/Juniorwebprogrammer/HyperSearch`. El Marketplace muestra
  el link y lo usa para "Report Issue", y sin él `vsce package` frena a
  preguntar `[y/N]`.
- **`license`** + `LICENSE`: ya está — Apache 2.0, en `package.json` y en el
  archivo `LICENSE` de la raíz, con copyright a nombre de Junior García.
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
  compile` + `scripts/bundle-ripgrep-binaries.js`) automáticamente antes de
  armar el paquete — no hace falta compilar a mano primero.
- **Binarios de ripgrep**: VS Code no corre `npm install` al instalar una
  extensión; el `.vsix` lleva tal cual lo que hay en `node_modules`, y npm
  solo instala el ripgrep de tu propia plataforma. Por eso
  `scripts/bundle-ripgrep-binaries.js` instala (con `--force --no-save`) los
  de Windows, macOS y Linux antes de empaquetar, y falla si falta alguno. El
  `.vsix` resultante pesa ~13 MB y funciona en cualquier sistema. Empaquetá
  desde Linux o macOS: desde Windows los binarios pierden el bit de ejecución
  (la extensión intenta corregirlo con `chmod` al arrancar, pero mejor no
  depender de eso).
- El `.vsix` generado queda en la raíz del proyecto; está en `.gitignore` y
  en `.vscodeignore` (no se empaqueta a sí mismo ni se versiona por
  accidente).
- `vsce` usa el `repository` de `package.json` para convertir los links
  relativos del README/CHANGELOG en links a GitHub.
