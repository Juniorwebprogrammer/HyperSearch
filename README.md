# HyperSearch

Search Everywhere de IntelliJ, para VS Code: doble tap de `Shift` abre una UI
propia (no el Quick Open / `Ctrl+P` nativo) con pestañas **All / Files /
Symbols / Text / Actions** para buscar archivos, símbolos, texto, comandos y
settings a la vez — con scopes, historial, recientes, y varias cosas que el
Quick Open / Find-in-Files nativos de VS Code no traen.

> Extensión en desarrollo activo, todavía no publicada en el Marketplace.
> Ver [Estado del proyecto](#estado-del-proyecto).

## Tabla de contenidos

- [Por qué](#por-qué)
- [Uso](#uso)
- [Funcionalidades que lo diferencian de VS Code](#funcionalidades-que-lo-diferencian-de-vs-code)
- [Instalar y desarrollar](#instalar-y-desarrollar)
- [Configuración](#configuración)
- [Tests](#tests)
- [Empaquetar y publicar](#empaquetar-y-publicar)
- [Roadmap y limitaciones conocidas](#roadmap-y-limitaciones-conocidas)
- [Estado del proyecto](#estado-del-proyecto)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## Por qué

VS Code separa "buscar" en varios comandos con UI y atajo distintos:
`Ctrl+P` para archivos, `Ctrl+T`/`Ctrl+Shift+O` para símbolos,
`Ctrl+Shift+F` para texto, `Ctrl+Shift+P` para comandos. IntelliJ los junta
todos en un solo cuadro — **Search Everywhere** — con pestañas por categoría
y un tab "All" que los busca a la vez. HyperSearch replica esa experiencia
dentro de VS Code, con una UI propia (un `WebviewView` con su ícono en la
activity bar) en vez de reutilizar el `QuickPick` nativo.

## Uso

- **Doble `Shift`** (o `Ctrl+Alt+E` / `Cmd+Alt+E`) cambia la activity bar a
  "HyperSearch" (expandiéndola si estaba colapsada) y enfoca el input.
  También se puede abrir haciendo click en su ícono propio de la activity bar.
- Pestaña **All** (por defecto): busca a la vez en archivos, símbolos, texto,
  comandos y settings, agrupados con encabezado por categoría — igual que el
  tab "All" de IntelliJ.
- Pestañas **Files / Symbols / Text / Actions**: la misma búsqueda pero
  enfocada en una sola categoría, sin el límite reducido de resultados por
  sección que aplica en "All".
- `Tab` / `Shift+Tab` (con el foco en el input) cambia de pestaña sin soltar el
  teclado; también se puede hacer click.
- `↑` / `↓` navega la lista, `Enter` abre el resultado seleccionado (la vista
  se queda abierta, no se cierra al elegir).
- `Alt+Enter` (o el botón "impl" de una fila de símbolo) busca sus
  **implementaciones** (equivalente a "Go to Implementation" de IntelliJ) y las
  muestra en un picker nativo.
- `Esc` limpia el foco y vuelve al editor activo.

## Funcionalidades que lo diferencian de VS Code

- **Búsqueda unificada de verdad** (tab All): un solo query golpea archivos +
  símbolos + texto + comandos + settings a la vez. VS Code obliga a saltar
  entre `Ctrl+P` / `Ctrl+T` / `Ctrl+Shift+F` / `Ctrl+Shift+P` por separado.
- **Recientes al abrir con query vacío**: en vez de listar archivos
  alfabéticamente, muestra lo último que abriste/ejecutaste (de cualquier
  categoría, ordenado por recencia) — como el estado inicial del Search
  Everywhere de IntelliJ. Se guarda por workspace (`workspaceState`).
- **Historial de búsquedas**: `Ctrl+↑` / `Ctrl+↓` en el input (vacío o no)
  recorre tus últimas queries que llevaron a abrir algo, sin pisar la
  navegación normal de la lista con flechas simples.
- **Tab Actions**: busca y ejecuta **comandos de VS Code** (los de cualquier
  extensión instalada, con su categoría, como el Command Palette) y busca y
  abre **settings** directamente en la UI de Settings — todo sin salir de
  este mismo cuadro.
- **Scopes de búsqueda** (selector arriba de los resultados): *Todo el
  proyecto* / *Archivo actual* / *Pestañas abiertas* / *Cambios de git* — como
  los scopes de IntelliJ. Aplica a Files, Symbols y Text (no a Actions).
  "Cambios de git" usa la API pública de la extensión Git integrada.
- **Opciones de Find-in-Files en el tab Text**: toggles `.*` (regex), `Aa`
  (sensible a mayúsculas) y `"ab"` (palabra completa) — antes solo hacía
  match de texto literal fijo.

## Instalar y desarrollar

Todavía no está publicada en el Marketplace (ver
[Estado del proyecto](#estado-del-proyecto)), así que por ahora se corre
desde el código fuente:

```bash
git clone <url-del-repo>   # o el .zip/carpeta, si todavía no hay repo
cd hyper-search
npm install
npm run compile
```

Pulsá `F5` en VS Code (con esta carpeta abierta) para lanzar un Extension
Development Host con la extensión cargada.

## Configuración

En `settings.json`:

```jsonc
{
  "hyperSearch.excludeGlobs": ["**/vendor/**"],
  "hyperSearch.maxResults": 50
}
```

Los excludes por defecto siempre se aplican (ver la lista completa y comentada
por ecosistema en `src/excludeGlobs.ts`); lo que pongas aquí se añade a esa
lista, no la reemplaza. Cubren carpetas que son solo dependencias/artefactos
de build, nunca código propio, así que buscar ahí solo agrega ruido:

| Ecosistema | Carpetas excluidas |
| --- | --- |
| Node.js | `node_modules`, `dist`, `out`, `build`, `coverage`, `.next`, `.git` |
| Flutter / Dart / móviles | `.dart_tool`, `.pub-cache`, `ios/Pods`, `ios/.symlinks`, `DerivedData` |
| Java / Kotlin / Android (Gradle) / Maven | `.gradle`, `target` |
| .NET / C# | `bin`, `obj`, `packages`, `.vs` |
| Python | `venv`, `.venv`, `__pycache__`, `.tox` |
| PHP (Composer) / Go (vendorizado) / Ruby (Bundler) | `vendor`, `.bundle` |
| Swift (SPM) | `.build` |

Si tu proyecto usa alguna de estas carpetas (p.ej. `bin/`) para código propio
y no para artefactos de build, hoy no hay forma de "desexcluirla" desde
settings — hay que buscarla manualmente en el editor. Ver
[Roadmap y limitaciones conocidas](#roadmap-y-limitaciones-conocidas).

## Tests

- **Unitarios** (lógica pura: fuzzy matching, exclude globs, parser de ripgrep,
  sin necesidad de levantar VS Code):
  ```bash
  npm run test:unit
  ```
- **Integración** (activa la extensión real en un VS Code de pruebas,
  descarga un VS Code headless la primera vez):
  ```bash
  npm run test:integration
  ```
- Todo junto:
  ```bash
  npm test
  ```

## Empaquetar y publicar

```bash
npm run package   # genera hyper-search-<version>.vsix, instalable local
                   # con: code --install-extension hyper-search-<version>.vsix
npm run publish    # sube la versión actual al Marketplace (necesita login previo)
```

Guía completa paso a paso (crear publisher, token, primer publish) en
`PUBLISHING.md`, en la raíz del proyecto (no un link clicable a propósito:
ese archivo es solo para quien tiene el código local — no viaja en el
`.vsix` ni tiene sentido enlazarlo sin un repositorio público todavía). Antes
de publicar de verdad hay que reemplazar el placeholder
`"publisher": "REPLACE-WITH-YOUR-PUBLISHER-ID"` en `package.json` por tu id
real — `npm run package` funciona igual con el placeholder (es solo un
string para armar el `.vsix` local), pero `vsce publish` sí lo va a rechazar
si no coincide con una cuenta real.

## Roadmap y limitaciones conocidas

- **Pendiente antes de publicar de verdad**: reemplazar el `"publisher"`
  placeholder (`REPLACE-WITH-YOUR-PUBLISHER-ID`) por un id real, completar el
  nombre en la línea de copyright de `LICENSE`, y —opcional— agregar
  `"repository"` cuando el código tenga un repo remoto. El resto (ícono de
  Marketplace, `LICENSE`, changelog) ya está listo. Ver `PUBLISHING.md`.
- No hay tab **Actions** para buscar/ejecutar acciones del propio HyperSearch
  (ej. cambiar de tema) — solo comandos/settings ya existentes de VS Code y
  sus extensiones.
- No es un diálogo modal flotante como IntelliJ — vive fijo en su propia zona
  del sidebar, con ícono propio en la activity bar. Es la variante más
  cercana a "UI 100% custom" que permite la API pública de extensiones de
  VS Code sin ocupar una pestaña de editor; un webview no puede flotar por
  encima de toda la ventana.
- Solo considera el **primer workspace folder** en la búsqueda de texto
  (multi-root no soportado todavía); los scopes "Pestañas abiertas"/"Cambios
  de git" filtran correctamente en multi-root para Files/Symbols, pero para
  Text solo cuentan los archivos que caen dentro de ese primer folder.
- El tab **Actions** lee comandos/settings de `package.json` de las
  extensiones instaladas (igual que hace el Command Palette internamente):
  no hay keybinding visible junto al comando, y el listado de comandos y
  settings se cachea hasta que se instala/activa una extensión nueva.
- El scope "Cambios de git" depende de la extensión Git integrada de VS Code
  (`vscode.git`) y de su API interna no tipada públicamente; si esa extensión
  está deshabilitada, el scope simplemente no devuelve archivos.
- Los excludes por defecto son fijos (una lista hardcodeada en
  `src/excludeGlobs.ts`): `hyperSearch.excludeGlobs` solo permite **añadir**
  más, no remover uno de los por defecto (p.ej. si tu proyecto usa `bin/`
  para código propio en vez de artefactos de build). Habría que agregar
  soporte a un prefijo tipo `!patrón` para "des-excluir" — no implementado
  todavía.
- El resaltado de coincidencias en la lista usa un match "greedy" simple
  (`matchPositions` en `fuzzyMatch.ts`), independiente del scoring real
  (`fuzzyScore`) que decide el orden — es solo una guía visual, puede no
  coincidir exactamente con qué letras "pesaron más" en el ranking.
- El binding `shift shift` depende de que VS Code interprete correctamente el
  chord de un mismo modificador repetido; si choca con otro binding tuyo, usa
  el fallback `Ctrl+Alt+E` / `Cmd+Alt+E` o remapea el comando
  `hyperSearch.open` en tus keybindings.

## Estado del proyecto

Desarrollo activo, sin publicar todavía. Nació en agosto de 2026 como una
extensión propia inspirada en Search Everywhere de IntelliJ, se llamó
"Search Everywhere" durante buena parte del desarrollo (todavía puede
aparecer así en capturas o issues viejos) y pasó a llamarse **HyperSearch**.
Ver `CHANGELOG.md` para el detalle versión por versión (no es un link
clicable a propósito: sin un `"repository"` en `package.json`, `vsce` no
puede reescribir links relativos al renderizar el README en el Marketplace —
se vuelve a habilitar como link en cuanto haya un repo).

## Contribuir

No hay todavía un flujo formal de PRs/issues (el proyecto no tiene repo
remoto por el momento), pero la idea es la de cualquier extensión de VS Code
open source:

1. `npm install`, `npm run compile`, `F5` para probar en un Extension
   Development Host.
2. `npm test` antes de mandar cualquier cambio (unitarios + integración).
3. Si agregás una carpeta de dependencias/build nueva a excluir por defecto
   en `src/excludeGlobs.ts`, recordá sincronizar el `default` de
   `hyperSearch.excludeGlobs` en `package.json` (son la misma lista,
   duplicada a mano porque `package.json` es JSON estático).
4. Una entrada nueva en `CHANGELOG.md` por cada cambio de comportamiento
   visible para quien usa la extensión.

## Licencia

Apache License 2.0 — texto completo en `LICENSE`, en la raíz del proyecto.
