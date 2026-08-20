# Changelog

Todos los cambios notables de esta extensión se documentan acá. El formato
sigue más o menos [Keep a Changelog](https://keepachangelog.com/); versionado
[semver](https://semver.org/).

## [0.1.0]

Primera versión pensada para publicarse en el Marketplace. Resume todo lo
construido hasta ahora, no solo lo nuevo desde la última entrega interna.
Incluye el rename de "Search Everywhere" a **HyperSearch** (nombre de
extensión, comandos, settings, vista e ícono) — no hubo release pública bajo
el nombre viejo, así que no queda como una entrada separada.

### Agregado

- UI propia en su **propia zona de la activity bar** (icono dedicado), no una
  sección dentro del Explorer ni el `QuickPick` nativo de `Ctrl+P`.
- Pestañas **All / Files / Symbols / Text / Actions**:
  - **All** busca a la vez en archivos, símbolos, texto, comandos y settings,
    agrupados por categoría.
  - **Actions** busca y ejecuta comandos de VS Code (de cualquier extensión
    instalada) y abre settings directamente en la UI de Settings.
- **Recientes**: al abrir con la búsqueda vacía, muestra lo último que
  abriste/ejecutaste (de cualquier categoría) en vez de listar archivos
  alfabéticamente.
- **Historial de queries** con `Ctrl+↑` / `Ctrl+↓`.
- **Scopes de búsqueda**: Todo el proyecto / Archivo actual / Pestañas
  abiertas / Cambios de git (vía la API de la extensión Git integrada).
- **Opciones de Find-in-Files** en el tab Text: regex, sensible a
  mayúsculas/minúsculas, palabra completa.
- Búsqueda de implementaciones (`Alt+Enter` o botón "impl" en una fila de
  símbolo), equivalente a "Go to Implementation".
- Resaltado de coincidencias en la lista de resultados.
- Excludes por defecto ampliados más allá de `node_modules`: carpetas de
  dependencias/build de Flutter/Dart, Java/Kotlin/Gradle/Maven, .NET, Python,
  PHP/Go/Ruby y Swift — configurables vía `hyperSearch.excludeGlobs`.
- Ícono nuevo ("Radar": lupa + barrido de radar) para la activity bar,
  reemplazando la lupa con destellos original. Ícono de color propio para el
  Marketplace.
- Metadata de publicación: licencia Apache 2.0, `CHANGELOG.md`, guía de
  publicación (`PUBLISHING.md`), scripts `npm run package` / `npm run
  publish`.

### Arreglado

- Búsqueda de texto: se leía todo el stdout de ripgrep antes de recortarlo a
  `maxResults`, lo que en proyectos grandes (p.ej. Flutter, con miles de
  archivos) podía superar el buffer de Node
  (`stdout maxBuffer length exceeded`). Ahora se lee la salida línea por línea
  y se corta el proceso apenas se junta `maxResults` coincidencias.

## [0.0.1]

MVP inicial: modal de búsqueda basado en `vscode.QuickPick` (archivos por
nombre, texto vía ripgrep con prefijo `/`, símbolos vía prefijo `#`).
