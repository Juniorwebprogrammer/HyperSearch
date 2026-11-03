# HyperSearch

IntelliJ's Search Everywhere, for VS Code: double-tap `Shift` to open a
custom UI (not the native Quick Open / `Ctrl+P`) with **All / Files /
Symbols / Text / Actions** tabs to search files, symbols, text, commands and
settings at once — with scopes, history, recents, and several things VS
Code's native Quick Open / Find-in-Files don't offer.

> Under active development, not yet published on the Marketplace.
> See [Project status](#project-status).

## Table of contents

- [Why](#why)
- [Usage](#usage)
- [What sets it apart from VS Code](#what-sets-it-apart-from-vs-code)
- [Install and develop](#install-and-develop)
- [Configuration](#configuration)
- [Tests](#tests)
- [Packaging and publishing](#packaging-and-publishing)
- [Roadmap and known limitations](#roadmap-and-known-limitations)
- [Project status](#project-status)
- [Contributing](#contributing)
- [License](#license)

## Why

VS Code splits "search" into several commands, each with its own UI and
shortcut: `Ctrl+P` for files, `Ctrl+T`/`Ctrl+Shift+O` for symbols,
`Ctrl+Shift+F` for text, `Ctrl+Shift+P` for commands. IntelliJ puts them all
in a single box — **Search Everywhere** — with one tab per category and an
"All" tab that searches them all at once. HyperSearch brings that experience
to VS Code with its own UI (a `WebviewView` with its own activity bar icon)
instead of reusing the native `QuickPick`.

## Usage

- **Double `Shift`** (or `Ctrl+Alt+E` / `Cmd+Alt+E`) switches the activity
  bar to "HyperSearch" (expanding it if it was collapsed) and focuses the
  input. You can also open it by clicking its activity bar icon.
- **All** tab (default): searches files, symbols, text, commands and
  settings at once, grouped under a header per category — just like
  IntelliJ's "All" tab.
- **Files / Symbols / Text / Actions** tabs: the same search focused on a
  single category, without the smaller per-section result cap that applies
  in "All".
- `Tab` / `Shift+Tab` (with focus in the input) switches tabs without leaving
  the keyboard; clicking works too.
- `↑` / `↓` moves through the list, `Enter` opens the selected result (the
  view stays open; it doesn't close when you pick something).
- `Alt+Enter` (or the "impl" button on a symbol row) finds its
  **implementations** (equivalent to IntelliJ's "Go to Implementation") and
  shows them in a native picker.
- `Esc` clears focus and returns to the active editor.

## What sets it apart from VS Code

- **Truly unified search** (All tab): a single query hits files + symbols +
  text + commands + settings at once. VS Code makes you jump between
  `Ctrl+P` / `Ctrl+T` / `Ctrl+Shift+F` / `Ctrl+Shift+P` separately.
- **Recents on an empty query**: instead of listing files alphabetically, it
  shows what you last opened/ran (from any category, sorted by recency) —
  like the initial state of IntelliJ's Search Everywhere. Stored per
  workspace (`workspaceState`).
- **Search history**: `Ctrl+↑` / `Ctrl+↓` in the input (empty or not) cycles
  through your recent queries that led to opening something, without
  interfering with plain arrow-key navigation of the list.
- **Actions tab**: search and run **VS Code commands** (from any installed
  extension, with their category, like the Command Palette) and search and
  open **settings** directly in the Settings UI — all without leaving this
  same box.
- **Search scopes** (selector above the results): *Whole project* / *Current
  file* / *Open tabs* / *Git changes* (shown in the UI as "Todo el proyecto",
  "Archivo actual", "Pestañas abiertas" and "Cambios de git") — like
  IntelliJ's scopes. Applies to Files, Symbols and Text (not Actions).
  "Git changes" uses the public API of the built-in Git extension.
- **Find-in-Files options in the Text tab**: `.*` (regex), `Aa` (match case)
  and `"ab"` (whole word) toggles — it used to match fixed literal text only.

## Install and develop

It isn't published on the Marketplace yet (see
[Project status](#project-status)). To install a packaged build, grab a
`.vsix` and run:

```bash
code --install-extension hyper-search-<version>.vsix
```

To run it from source:

```bash
git clone https://github.com/Juniorwebprogrammer/HyperSearch.git
cd HyperSearch
npm install
npm run compile
```

Press `F5` in VS Code (with this folder open) to launch an Extension
Development Host with the extension loaded.

## Configuration

In `settings.json`:

```jsonc
{
  "hyperSearch.excludeGlobs": ["**/vendor/**"],
  "hyperSearch.maxResults": 50
}
```

The default excludes always apply (see the full list, commented per
ecosystem, in [`src/excludeGlobs.ts`](src/excludeGlobs.ts)); whatever you add
here is appended to that list, it doesn't replace it. They cover folders that
only hold dependencies/build artifacts, never your own code, so searching
them just adds noise:

| Ecosystem | Excluded folders |
| --- | --- |
| Node.js | `node_modules`, `dist`, `out`, `build`, `coverage`, `.next`, `.git` |
| Flutter / Dart / mobile | `.dart_tool`, `.pub-cache`, `ios/Pods`, `ios/.symlinks`, `DerivedData` |
| Java / Kotlin / Android (Gradle) / Maven | `.gradle`, `target` |
| .NET / C# | `bin`, `obj`, `packages`, `.vs` |
| Python | `venv`, `.venv`, `__pycache__`, `.tox` |
| PHP (Composer) / Go (vendored) / Ruby (Bundler) | `vendor`, `.bundle` |
| Swift (SPM) | `.build` |

If your project uses one of these folders (e.g. `bin/`) for your own code
rather than build artifacts, there's currently no way to "un-exclude" it from
settings — you'll have to search it manually in the editor. See
[Roadmap and known limitations](#roadmap-and-known-limitations).

## Tests

- **Unit** (pure logic: fuzzy matching, exclude globs, ripgrep parser,
  ripgrep binary lookup — no need to launch VS Code):
  ```bash
  npm run test:unit
  ```
- **Integration** (activates the real extension in a test VS Code instance;
  downloads VS Code the first time):
  ```bash
  npm run test:integration
  ```
- Everything:
  ```bash
  npm test
  ```

## Packaging and publishing

```bash
npm run package   # builds hyper-search-<version>.vsix, installable locally
                   # with: code --install-extension hyper-search-<version>.vsix
npm run publish    # uploads the current version to the Marketplace (requires logging in first)
```

`npm run package` bundles the ripgrep binaries for Windows, macOS and Linux
(x64/arm64, plus linux-arm) into the `.vsix`, so a single package works on
every platform no matter which OS you build it on. Build it on Linux or macOS:
building on Windows drops the executable bit from the binaries.

Full step-by-step guide (publisher, token, first publish) in
[`PUBLISHING.md`](PUBLISHING.md). The extension is published under the
`turinconconnect` publisher, so its ID is `turinconconnect.hyper-search`.
`.vsix` builds up to 0.1.1 used a placeholder publisher: uninstall those
before installing a newer version, or VS Code will keep both.

## Roadmap and known limitations

- There's no **Actions** tab entry for HyperSearch's own actions (e.g.
  changing the theme) — only existing VS Code commands/settings and those of
  its extensions.
- It's not a floating modal dialog like IntelliJ's — it lives docked in its
  own sidebar area, with its own activity bar icon. That's the closest to a
  "100% custom UI" that VS Code's public extension API allows without taking
  up an editor tab; a webview can't float above the whole window.
- Text search only considers the **first workspace folder** (multi-root
  isn't supported yet); the "Open tabs"/"Git changes" scopes filter
  correctly in multi-root for Files/Symbols, but for Text only files inside
  that first folder count.
- The **Actions** tab reads commands/settings from the `package.json` of
  installed extensions (just like the Command Palette does internally): no
  keybinding is shown next to the command, and the command and settings list
  is cached until a new extension is installed/activated.
- The "Git changes" scope depends on VS Code's built-in Git extension
  (`vscode.git`) and its internal, not publicly typed API; if that extension
  is disabled, the scope simply returns no files.
- The default excludes are fixed (a hardcoded list in
  [`src/excludeGlobs.ts`](src/excludeGlobs.ts)): `hyperSearch.excludeGlobs`
  only lets you **add** more, not remove a default one (e.g. if your project
  uses `bin/` for your own code instead of build artifacts). Supporting a
  `!pattern`-style prefix to "un-exclude" would be needed — not implemented
  yet.
- Match highlighting in the list uses a simple "greedy" match
  (`matchPositions` in `fuzzyMatch.ts`), independent from the actual scoring
  (`fuzzyScore`) that decides the order — it's only a visual hint and may not
  exactly match which letters "weighed more" in the ranking.
- The `shift shift` binding relies on VS Code correctly interpreting a chord
  of the same repeated modifier; if it clashes with another binding of
  yours, use the `Ctrl+Alt+E` / `Cmd+Alt+E` fallback or remap the
  `hyperSearch.open` command in your keybindings.

## Project status

Active development, not published yet. It started in August 2026 as a
custom extension inspired by IntelliJ's Search Everywhere, was called
"Search Everywhere" for much of its development (it may still show up that
way in old screenshots or issues) and was renamed **HyperSearch**. See
[`CHANGELOG.md`](CHANGELOG.md) for version-by-version details.

## Contributing

Issues and pull requests are welcome at
[github.com/Juniorwebprogrammer/HyperSearch](https://github.com/Juniorwebprogrammer/HyperSearch).
The workflow is the same as any open-source VS Code extension:

1. `npm install`, `npm run compile`, `F5` to try it in an Extension
   Development Host.
2. `npm test` before submitting any change (unit + integration).
3. If you add a new dependency/build folder to exclude by default in
   [`src/excludeGlobs.ts`](src/excludeGlobs.ts), remember to sync the
   `default` of `hyperSearch.excludeGlobs` in `package.json` (they're the
   same list, duplicated by hand because `package.json` is static JSON).
4. Add a new entry to [`CHANGELOG.md`](CHANGELOG.md) for every change in
   behavior visible to users of the extension.

## License

Apache License 2.0 — full text in [`LICENSE`](LICENSE).
