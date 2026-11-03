# Changelog

All notable changes to this extension are documented here. The format
loosely follows [Keep a Changelog](https://keepachangelog.com/); versioning
follows [semver](https://semver.org/).

## [0.1.1] - 2026-11-03

### Fixed

- The extension failed to start on systems other than the one the `.vsix` was
  built on (e.g. Windows with a `.vsix` packaged on Linux): `@vscode/ripgrep`
  only installs the binary for the local platform, and when it couldn't find
  `@vscode/ripgrep-win32-x64` it threw on load, breaking activation
  entirely. `vscode:prepublish` now bundles the Windows, macOS and Linux
  binaries (x64/arm64, plus linux-arm) into the `.vsix`.
- The extension no longer imports `@vscode/ripgrep` (ESM-only since 1.18,
  which failed with `ERR_REQUIRE_ESM` on VS Code builds with an older Node):
  it resolves the binary directly, falling back to the ripgrep bundled with
  VS Code itself. If neither is available, only text search is disabled
  (with a warning) instead of the whole extension.

## [0.1.0]

First version intended for Marketplace publication. It summarizes everything
built so far, not just what's new since the last internal drop. Includes the
rename from "Search Everywhere" to **HyperSearch** (extension name, commands,
settings, view and icon) — there was no public release under the old name,
so it isn't a separate entry.

### Added

- Custom UI in its **own activity bar area** (dedicated icon), not a section
  inside the Explorer nor the native `Ctrl+P` `QuickPick`.
- **All / Files / Symbols / Text / Actions** tabs:
  - **All** searches files, symbols, text, commands and settings at once,
    grouped by category.
  - **Actions** searches and runs VS Code commands (from any installed
    extension) and opens settings directly in the Settings UI.
- **Recents**: opening with an empty query shows what you last
  opened/ran (from any category) instead of listing files alphabetically.
- **Query history** with `Ctrl+↑` / `Ctrl+↓`.
- **Search scopes**: Whole project / Current file / Open tabs / Git changes
  (via the built-in Git extension's API).
- **Find-in-Files options** in the Text tab: regex, match case, whole word.
- Implementation search (`Alt+Enter` or the "impl" button on a symbol row),
  equivalent to "Go to Implementation".
- Match highlighting in the results list.
- Default excludes extended beyond `node_modules`: dependency/build folders
  for Flutter/Dart, Java/Kotlin/Gradle/Maven, .NET, Python, PHP/Go/Ruby and
  Swift — configurable via `hyperSearch.excludeGlobs`.
- New icon ("Radar": magnifying glass + radar sweep) for the activity bar,
  replacing the original sparkle magnifier. Dedicated color icon for the
  Marketplace.
- Publishing metadata: Apache 2.0 license, `CHANGELOG.md`, publishing guide
  (`PUBLISHING.md`), `npm run package` / `npm run publish` scripts.

### Fixed

- Text search: the whole ripgrep stdout was read before trimming it to
  `maxResults`, which in large projects (e.g. Flutter, with thousands of
  files) could exceed Node's buffer (`stdout maxBuffer length exceeded`).
  Output is now read line by line and the process is stopped as soon as
  `maxResults` matches are collected.

## [0.0.1]

Initial MVP: search modal based on `vscode.QuickPick` (files by name, text
via ripgrep with a `/` prefix, symbols with a `#` prefix).
