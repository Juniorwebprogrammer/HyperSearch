import * as path from "path";
import * as vscode from "vscode";
import { fuzzyFilterSort, matchPositions } from "./fuzzyMatch";
import { listWorkspaceFiles, toWorkspaceRelativePath } from "./fileIndex";
import { searchWithRipgrep } from "./ripgrepSearch";
import { searchWorkspaceSymbols, findImplementations } from "./symbolSearch";
import { getWebviewHtml } from "./hyperSearchWebviewHtml";

type Tab = "all" | "file" | "symbol" | "text" | "action";
type ItemKind = "file" | "symbol" | "text" | "command" | "setting";
/** Alcance de la búsqueda de archivos/símbolos/texto (no aplica a Actions). */
type Scope = "all" | "currentFile" | "openTabs" | "gitChanges";

interface TextOptions {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

const DEFAULT_TEXT_OPTIONS: TextOptions = { regex: false, caseSensitive: false, wholeWord: false };

/** Representación interna (no serializable) de un resultado, para poder abrirlo/re-recordarlo. */
type InternalItem =
  | { kind: "file"; uri: vscode.Uri }
  | { kind: "symbol"; symbol: vscode.SymbolInformation }
  | { kind: "text"; uri: vscode.Uri; line: number; column: number; text: string }
  | { kind: "command"; commandId: string; title: string; category?: string }
  | { kind: "setting"; settingId: string; description: string };

/** Forma serializable que viaja al webview (sin objetos vscode.*). */
interface WireItem {
  id: string;
  kind: ItemKind;
  iconHtml: string;
  nameHtml: string;
  path: string;
}

interface WireGroup {
  key: string;
  label: string;
  items: WireItem[];
}

/** Entrada persistida de "abierto recientemente", en workspaceState. */
type RecentEntry =
  | { kind: "file"; uri: string; timestamp: number }
  | {
      kind: "symbol";
      uri: string;
      line: number;
      character: number;
      name: string;
      symbolKind: vscode.SymbolKind;
      containerName?: string;
      timestamp: number;
    }
  | { kind: "text"; uri: string; line: number; column: number; text: string; timestamp: number }
  | { kind: "command"; commandId: string; title: string; category?: string; timestamp: number }
  | { kind: "setting"; settingId: string; description: string; timestamp: number };

const ALL_RECENT_KINDS: ReadonlyArray<RecentEntry["kind"]> = [
  "file",
  "symbol",
  "text",
  "command",
  "setting",
];

function kindsForTab(tab: Exclude<Tab, "all">): RecentEntry["kind"][] {
  if (tab === "action") {
    return ["command", "setting"];
  }
  return [tab];
}

function recentKey(entry: RecentEntry): string {
  switch (entry.kind) {
    case "file":
      return `file:${entry.uri}`;
    case "symbol":
      return `symbol:${entry.uri}:${entry.line}:${entry.character}:${entry.name}`;
    case "text":
      return `text:${entry.uri}:${entry.line}:${entry.column}`;
    case "command":
      return `command:${entry.commandId}`;
    case "setting":
      return `setting:${entry.settingId}`;
  }
}

/** Cap de resultados por categoría cuando se busca en la pestaña "All" (vista combinada). */
const ALL_TAB_CAP = 8;
const ALL_TAB_ACTION_CAP = 5;
const RECENTS_KEY = "hyperSearch.recents";
const MAX_RECENTS = 30;
const QUERY_HISTORY_KEY = "hyperSearch.queryHistory";
const MAX_QUERY_HISTORY = 20;

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("hyperSearch");
  return {
    excludeGlobs: cfg.get<string[]>("excludeGlobs", []),
    maxResults: cfg.get<number>("maxResults", 50),
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Envuelve en <mark> las posiciones de match, escapando el resto. */
function highlightHtml(text: string, positions: number[]): string {
  if (positions.length === 0) {
    return escapeHtml(text);
  }
  const posSet = new Set(positions);
  let html = "";
  let markOpen = false;
  for (let i = 0; i < text.length; i++) {
    const shouldMark = posSet.has(i);
    if (shouldMark && !markOpen) {
      html += "<mark>";
      markOpen = true;
    } else if (!shouldMark && markOpen) {
      html += "</mark>";
      markOpen = false;
    }
    html += escapeHtml(text[i]);
  }
  if (markOpen) {
    html += "</mark>";
  }
  return html;
}

const FILE_ICON_HTML = '<span class="item-icon">📄</span>';
const TEXT_ICON_HTML = '<span class="item-icon">🔎</span>';
const COMMAND_ICON_HTML = '<span class="item-icon">▶</span>';
const SETTING_ICON_HTML = '<span class="item-icon">⚙</span>';

interface SymbolBadge {
  letter: string;
  color: string;
}

/** Insignia de color/letra por tipo de símbolo, al estilo de los iconos de IntelliJ. */
function symbolBadge(kind: vscode.SymbolKind): SymbolBadge {
  const K = vscode.SymbolKind;
  switch (kind) {
    case K.Class:
    case K.Struct:
      return { letter: "C", color: "#d5a628" };
    case K.Interface:
      return { letter: "I", color: "#4aa8e0" };
    case K.Method:
    case K.Constructor:
    case K.Operator:
      return { letter: "M", color: "#a371f7" };
    case K.Function:
      return { letter: "Fn", color: "#a371f7" };
    case K.Field:
      return { letter: "Fd", color: "#3fb1a5" };
    case K.Property:
      return { letter: "P", color: "#3fb1a5" };
    case K.Variable:
      return { letter: "V", color: "#4a9edb" };
    case K.Constant:
      return { letter: "K", color: "#4a9edb" };
    case K.Enum:
      return { letter: "E", color: "#d5824a" };
    case K.EnumMember:
      return { letter: "Em", color: "#d5824a" };
    case K.Module:
    case K.Namespace:
    case K.Package:
      return { letter: "N", color: "#8a8a8a" };
    case K.TypeParameter:
      return { letter: "T", color: "#8a8a8a" };
    default:
      return { letter: "S", color: "#8a8a8a" };
  }
}

function symbolIconHtml(kind: vscode.SymbolKind): string {
  const { letter, color } = symbolBadge(kind);
  return `<span class="badge" style="background:${color}">${escapeHtml(letter)}</span>`;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `i${idCounter}`;
}

function makeNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

interface CommandEntry {
  id: string;
  title: string;
  category?: string;
}

interface SettingEntry {
  id: string;
  description: string;
}

/**
 * Recolecta comandos declarados por VS Code y todas las extensiones instaladas
 * (vía su package.json), igual que hace internamente el Command Palette.
 * No hay API pública que devuelva título+categoría por comando, así que se
 * lee directamente de las contribuciones declaradas.
 */
function collectCommandEntries(): CommandEntry[] {
  const seen = new Map<string, CommandEntry>();
  for (const ext of vscode.extensions.all) {
    const declared = ext.packageJSON?.contributes?.commands;
    if (!Array.isArray(declared)) {
      continue;
    }
    for (const c of declared) {
      const id = c?.command;
      const title = typeof c?.title === "string" ? c.title : undefined;
      if (!id || !title || seen.has(id)) {
        continue;
      }
      seen.set(id, { id, title, category: typeof c?.category === "string" ? c.category : undefined });
    }
  }
  return Array.from(seen.values());
}

/** Recolecta settings declarados por VS Code y las extensiones instaladas. */
function collectSettingEntries(): SettingEntry[] {
  const seen = new Map<string, SettingEntry>();
  for (const ext of vscode.extensions.all) {
    const config = ext.packageJSON?.contributes?.configuration;
    const sections: any[] = Array.isArray(config) ? config : config ? [config] : [];
    for (const section of sections) {
      const props = section?.properties;
      if (!props || typeof props !== "object") {
        continue;
      }
      for (const [id, def] of Object.entries<any>(props)) {
        if (seen.has(id)) {
          continue;
        }
        seen.set(id, { id, description: def?.description ?? def?.markdownDescription ?? "" });
      }
    }
  }
  return Array.from(seen.values());
}

/** Uris de los documentos de texto abiertos en cualquier pestaña/grupo. */
function getOpenTabUris(): vscode.Uri[] {
  const uris: vscode.Uri[] = [];
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        uris.push(tab.input.uri);
      }
    }
  }
  return uris;
}

/**
 * Archivos con cambios pendientes según la extensión Git integrada de VS Code.
 * Usa su API pública (vscode.git); si esa extensión no está presente/activa,
 * devuelve vacío en vez de fallar — no hay tipos publicados para su API, así
 * que se accede de forma defensiva.
 */
async function getGitChangedFileUris(): Promise<vscode.Uri[]> {
  try {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      return [];
    }
    const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (exports as any)?.getAPI?.(1);
    if (!api) {
      return [];
    }
    const uris: vscode.Uri[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const repo of api.repositories ?? []) {
      const state = repo?.state;
      const changeLists = [state?.workingTreeChanges, state?.indexChanges, state?.mergeChanges];
      for (const list of changeLists) {
        for (const change of list ?? []) {
          if (change?.uri) {
            uris.push(change.uri);
          }
        }
      }
    }
    return uris;
  } catch {
    return [];
  }
}

async function resolveScopeUris(scope: Scope): Promise<Set<string> | undefined> {
  switch (scope) {
    case "all":
      return undefined;
    case "currentFile": {
      const uri = vscode.window.activeTextEditor?.document.uri;
      return new Set(uri ? [uri.fsPath] : []);
    }
    case "openTabs":
      return new Set(getOpenTabUris().map((u) => u.fsPath));
    case "gitChanges":
      return new Set((await getGitChangedFileUris()).map((u) => u.fsPath));
  }
}

/**
 * Provee la vista "HyperSearch" anclada en su propia zona del sidebar
 * (icono propio en la activity bar), en vez de un WebviewPanel flotando en el
 * área de editores. Se mantiene viva (retainContextWhenHidden) mientras el
 * usuario no la cierre explícitamente, así que abrir un resultado NO la
 * descarta — igual que el Explorer se queda abierto después de abrir un archivo.
 */
export class HyperSearchViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "hyperSearch.view";
  private static instance: HyperSearchViewProvider | undefined;

  private view: vscode.WebviewView | undefined;
  private itemsById = new Map<string, InternalItem>();
  private fileListCache: vscode.Uri[] | undefined;
  private latestSeq = -1;
  private commandEntriesCache: CommandEntry[] | undefined;
  private settingEntriesCache: SettingEntry[] | undefined;

  private constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.extensions.onDidChange(() => {
        // Nuevas extensiones instaladas/activadas pueden traer nuevos comandos/settings.
        this.commandEntriesCache = undefined;
        this.settingEntriesCache = undefined;
      })
    );
  }

  public static register(context: vscode.ExtensionContext): HyperSearchViewProvider {
    const provider = new HyperSearchViewProvider(context);
    HyperSearchViewProvider.instance = provider;
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(HyperSearchViewProvider.viewId, provider, {
        webviewOptions: { retainContextWhenHidden: true },
      })
    );
    return provider;
  }

  /** Revela la vista (expandiendo su sección si está colapsada) y enfoca el input de búsqueda. */
  public static async reveal(): Promise<void> {
    const instance = HyperSearchViewProvider.instance;
    if (instance?.view) {
      instance.view.show(false);
    } else {
      // La vista aún no se ha resuelto ni una vez (extensión recién activada,
      // sección colapsada): el comando autogenerado por VS Code la fuerza a montarse.
      await vscode.commands.executeCommand(`${HyperSearchViewProvider.viewId}.focus`);
    }
    instance?.view?.webview.postMessage({ type: "focus" });
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewHtml(makeNonce());
    webviewView.webview.onDidReceiveMessage((message) => void this.handleMessage(message));
    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
    });
  }

  private async handleMessage(message: {
    type: string;
    tab?: Tab;
    query?: string;
    seq?: number;
    id?: string;
    scope?: Scope;
    textOptions?: TextOptions;
  }): Promise<void> {
    switch (message.type) {
      case "ready":
        this.view?.webview.postMessage({ type: "history", queries: this.getQueryHistory() });
        break;
      case "search":
        await this.handleSearch(
          message.tab ?? "all",
          message.query ?? "",
          message.seq ?? 0,
          message.scope ?? "all",
          message.textOptions ?? DEFAULT_TEXT_OPTIONS
        );
        break;
      case "accept":
        if (message.id) {
          await this.handleAccept(message.id, message.query ?? "");
        }
        break;
      case "showImplementations":
        if (message.id) {
          await this.handleShowImplementations(message.id);
        }
        break;
      case "close":
        // No hay "cerrar" para una vista de sidebar anclada: sencillamente
        // devolvemos el foco al editor activo, como al Esc-ear en el Explorer.
        await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
        break;
    }
  }

  private async handleSearch(
    tab: Tab,
    query: string,
    seq: number,
    scope: Scope,
    textOptions: TextOptions
  ): Promise<void> {
    if (!this.view) {
      return;
    }
    this.latestSeq = seq;
    this.itemsById.clear();

    try {
      const scopeUris = await resolveScopeUris(scope);
      if (seq !== this.latestSeq) {
        return;
      }
      const groups =
        tab === "all"
          ? await this.buildAllGroups(query, scopeUris, textOptions)
          : await this.buildTabGroup(tab, query, scopeUris, textOptions);
      if (seq !== this.latestSeq) {
        return; // Una búsqueda más nueva ya está en curso; descarta esta respuesta obsoleta.
      }
      void this.view.webview.postMessage({ type: "results", tab, seq, groups });
    } catch (err) {
      if (seq !== this.latestSeq) {
        return;
      }
      vscode.window.showErrorMessage(
        `HyperSearch: error en la búsqueda — ${(err as Error).message}`
      );
      void this.view.webview.postMessage({ type: "results", tab, seq, groups: [] });
    }
  }

  private async buildAllGroups(
    query: string,
    scopeUris: Set<string> | undefined,
    textOptions: TextOptions
  ): Promise<WireGroup[]> {
    if (query.trim().length === 0) {
      const recents = this.buildRecentsGroup(ALL_RECENT_KINDS, 15);
      if (recents.length > 0) {
        return recents;
      }
      // Sin historial (workspace nuevo): cae al listado de archivos de siempre.
    }
    const { excludeGlobs } = getConfig();
    const [files, symbols, text] = await Promise.all([
      this.searchFiles(query, excludeGlobs, ALL_TAB_CAP, scopeUris),
      this.searchSymbols(query, ALL_TAB_CAP, scopeUris),
      this.searchText(query, excludeGlobs, ALL_TAB_CAP, scopeUris, textOptions),
    ]);
    const actionsGroups = this.buildActionsGroups(query, ALL_TAB_ACTION_CAP);
    return [
      { key: "file", label: "Files", items: files },
      { key: "symbol", label: "Symbols", items: symbols },
      { key: "text", label: "Text", items: text },
      ...actionsGroups,
    ];
  }

  private async buildTabGroup(
    tab: Exclude<Tab, "all">,
    query: string,
    scopeUris: Set<string> | undefined,
    textOptions: TextOptions
  ): Promise<WireGroup[]> {
    if (query.trim().length === 0) {
      const recents = this.buildRecentsGroup(kindsForTab(tab), 20);
      if (recents.length > 0) {
        return recents;
      }
    }
    const { excludeGlobs, maxResults } = getConfig();
    if (tab === "file") {
      return [{ key: "file", label: "Files", items: await this.searchFiles(query, excludeGlobs, maxResults, scopeUris) }];
    }
    if (tab === "symbol") {
      return [{ key: "symbol", label: "Symbols", items: await this.searchSymbols(query, maxResults, scopeUris) }];
    }
    if (tab === "text") {
      return [
        {
          key: "text",
          label: "Text",
          items: await this.searchText(query, excludeGlobs, maxResults, scopeUris, textOptions),
        },
      ];
    }
    return this.buildActionsGroups(query, maxResults);
  }

  private async searchFiles(
    query: string,
    excludeGlobs: string[],
    maxResults: number,
    scopeUris: Set<string> | undefined
  ): Promise<WireItem[]> {
    if (!this.fileListCache) {
      this.fileListCache = await listWorkspaceFiles(excludeGlobs);
    }
    const candidates = scopeUris
      ? this.fileListCache.filter((uri) => scopeUris.has(uri.fsPath))
      : this.fileListCache;
    const matched = fuzzyFilterSort(query, candidates, (uri) => toWorkspaceRelativePath(uri), maxResults);
    return matched.map((uri) => {
      const rel = toWorkspaceRelativePath(uri);
      const parts = rel.split("/");
      const name = parts[parts.length - 1];
      const id = nextId();
      this.itemsById.set(id, { kind: "file", uri });
      return {
        id,
        kind: "file",
        iconHtml: FILE_ICON_HTML,
        nameHtml: highlightHtml(name, matchPositions(query, name)),
        path: rel,
      };
    });
  }

  private async searchSymbols(
    query: string,
    maxResults: number,
    scopeUris: Set<string> | undefined
  ): Promise<WireItem[]> {
    let symbols = await searchWorkspaceSymbols(query);
    if (scopeUris) {
      symbols = symbols.filter((s) => scopeUris.has(s.location.uri.fsPath));
    }
    symbols = symbols.slice(0, maxResults);
    return symbols.map((symbol) => {
      const id = nextId();
      this.itemsById.set(id, { kind: "symbol", symbol });
      const nameHtml = highlightHtml(symbol.name, matchPositions(query, symbol.name));
      const pathParts = [
        symbol.containerName,
        toWorkspaceRelativePath(symbol.location.uri),
      ].filter((p) => p && p.length > 0);
      return {
        id,
        kind: "symbol",
        iconHtml: symbolIconHtml(symbol.kind),
        nameHtml,
        path: pathParts.join(" · "),
      };
    });
  }

  private async searchText(
    query: string,
    excludeGlobs: string[],
    maxResults: number,
    scopeUris: Set<string> | undefined,
    textOptions: TextOptions
  ): Promise<WireItem[]> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return [];
    }
    let onlyPaths: string[] | undefined;
    if (scopeUris) {
      const folderPath = folder.uri.fsPath;
      onlyPaths = Array.from(scopeUris)
        // Solo rutas que efectivamente cuelgan del folder que ripgrep va a recorrer
        // (la búsqueda de texto solo soporta el primer workspace folder).
        .filter((fsPath) => fsPath === folderPath || fsPath.startsWith(folderPath + path.sep))
        .map((fsPath) => toWorkspaceRelativePath(vscode.Uri.file(fsPath)));
    }
    const matches = await searchWithRipgrep({
      cwd: folder.uri.fsPath,
      query,
      excludeGlobs,
      maxResults,
      onlyPaths,
      regex: textOptions.regex,
      caseSensitive: textOptions.caseSensitive,
      wholeWord: textOptions.wholeWord,
    });
    return matches.map((m) => {
      const id = nextId();
      const uri = vscode.Uri.joinPath(folder.uri, m.file);
      const text = m.text.trim();
      this.itemsById.set(id, { kind: "text", uri, line: m.line, column: m.column, text });
      return {
        id,
        kind: "text",
        iconHtml: TEXT_ICON_HTML,
        nameHtml: highlightHtml(text, matchPositions(query, text)),
        path: `${m.file}:${m.line}`,
      };
    });
  }

  private getCommandEntries(): CommandEntry[] {
    if (!this.commandEntriesCache) {
      this.commandEntriesCache = collectCommandEntries();
    }
    return this.commandEntriesCache;
  }

  private getSettingEntries(): SettingEntry[] {
    if (!this.settingEntriesCache) {
      this.settingEntriesCache = collectSettingEntries();
    }
    return this.settingEntriesCache;
  }

  /** A diferencia de Files, Actions/Settings no se listan "todas" con query vacía: son demasiadas. */
  private buildActionsGroups(query: string, maxResults: number): WireGroup[] {
    if (query.trim().length === 0) {
      return [];
    }
    const commandItems = fuzzyFilterSort(
      query,
      this.getCommandEntries(),
      (c) => (c.category ? `${c.category}: ${c.title}` : c.title),
      maxResults
    ).map((c) => {
      const id = nextId();
      this.itemsById.set(id, { kind: "command", commandId: c.id, title: c.title, category: c.category });
      const label = c.category ? `${c.category}: ${c.title}` : c.title;
      return {
        id,
        kind: "command" as const,
        iconHtml: COMMAND_ICON_HTML,
        nameHtml: highlightHtml(label, matchPositions(query, label)),
        path: "",
      };
    });
    const settingItems = fuzzyFilterSort(
      query,
      this.getSettingEntries(),
      (s) => `${s.id} ${s.description}`,
      maxResults
    ).map((s) => {
      const id = nextId();
      this.itemsById.set(id, { kind: "setting", settingId: s.id, description: s.description });
      return {
        id,
        kind: "setting" as const,
        iconHtml: SETTING_ICON_HTML,
        nameHtml: highlightHtml(s.id, matchPositions(query, s.id)),
        path: s.description.slice(0, 100),
      };
    });
    const groups: WireGroup[] = [];
    if (commandItems.length > 0) {
      groups.push({ key: "command", label: "Commands", items: commandItems });
    }
    if (settingItems.length > 0) {
      groups.push({ key: "setting", label: "Settings", items: settingItems });
    }
    return groups;
  }

  // ---- Recientes + historial de queries (workspaceState) ----

  private getRecents(): RecentEntry[] {
    return this.context.workspaceState.get<RecentEntry[]>(RECENTS_KEY, []);
  }

  private async pushRecent(entry: RecentEntry): Promise<void> {
    const key = recentKey(entry);
    const existing = this.getRecents().filter((e) => recentKey(e) !== key);
    existing.unshift(entry);
    await this.context.workspaceState.update(RECENTS_KEY, existing.slice(0, MAX_RECENTS));
  }

  private buildRecentsGroup(kinds: readonly RecentEntry["kind"][], cap: number): WireGroup[] {
    const filtered = this.getRecents()
      .filter((e) => kinds.includes(e.kind))
      .slice(0, cap);
    if (filtered.length === 0) {
      return [];
    }
    return [{ key: "recent", label: "Recientes", items: filtered.map((e) => this.recentToWireItem(e)) }];
  }

  private recentToWireItem(entry: RecentEntry): WireItem {
    const id = nextId();
    switch (entry.kind) {
      case "file": {
        const uri = vscode.Uri.parse(entry.uri);
        this.itemsById.set(id, { kind: "file", uri });
        const rel = toWorkspaceRelativePath(uri);
        const name = rel.split("/").pop() ?? rel;
        return { id, kind: "file", iconHtml: FILE_ICON_HTML, nameHtml: escapeHtml(name), path: rel };
      }
      case "text": {
        const uri = vscode.Uri.parse(entry.uri);
        this.itemsById.set(id, { kind: "text", uri, line: entry.line, column: entry.column, text: entry.text });
        return {
          id,
          kind: "text",
          iconHtml: TEXT_ICON_HTML,
          nameHtml: escapeHtml(entry.text),
          path: `${toWorkspaceRelativePath(uri)}:${entry.line}`,
        };
      }
      case "symbol": {
        const uri = vscode.Uri.parse(entry.uri);
        const position = new vscode.Position(entry.line, entry.character);
        const symbol = new vscode.SymbolInformation(
          entry.name,
          entry.symbolKind,
          entry.containerName ?? "",
          new vscode.Location(uri, position)
        );
        this.itemsById.set(id, { kind: "symbol", symbol });
        const pathParts = [entry.containerName, toWorkspaceRelativePath(uri)].filter(
          (p) => p && p.length > 0
        );
        return {
          id,
          kind: "symbol",
          iconHtml: symbolIconHtml(entry.symbolKind),
          nameHtml: escapeHtml(entry.name),
          path: pathParts.join(" · "),
        };
      }
      case "command": {
        this.itemsById.set(id, { kind: "command", commandId: entry.commandId, title: entry.title, category: entry.category });
        const label = entry.category ? `${entry.category}: ${entry.title}` : entry.title;
        return { id, kind: "command", iconHtml: COMMAND_ICON_HTML, nameHtml: escapeHtml(label), path: "" };
      }
      case "setting": {
        this.itemsById.set(id, { kind: "setting", settingId: entry.settingId, description: entry.description });
        return {
          id,
          kind: "setting",
          iconHtml: SETTING_ICON_HTML,
          nameHtml: escapeHtml(entry.settingId),
          path: entry.description.slice(0, 100),
        };
      }
    }
  }

  private recordRecent(item: InternalItem): void {
    const timestamp = Date.now();
    let entry: RecentEntry;
    switch (item.kind) {
      case "file":
        entry = { kind: "file", uri: item.uri.toString(), timestamp };
        break;
      case "text":
        entry = { kind: "text", uri: item.uri.toString(), line: item.line, column: item.column, text: item.text, timestamp };
        break;
      case "symbol":
        entry = {
          kind: "symbol",
          uri: item.symbol.location.uri.toString(),
          line: item.symbol.location.range.start.line,
          character: item.symbol.location.range.start.character,
          name: item.symbol.name,
          symbolKind: item.symbol.kind,
          containerName: item.symbol.containerName,
          timestamp,
        };
        break;
      case "command":
        entry = { kind: "command", commandId: item.commandId, title: item.title, category: item.category, timestamp };
        break;
      case "setting":
        entry = { kind: "setting", settingId: item.settingId, description: item.description, timestamp };
        break;
    }
    void this.pushRecent(entry);
  }

  private getQueryHistory(): string[] {
    return this.context.workspaceState.get<string[]>(QUERY_HISTORY_KEY, []);
  }

  private async pushQueryHistory(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const existing = this.getQueryHistory().filter((q) => q !== trimmed);
    existing.unshift(trimmed);
    await this.context.workspaceState.update(QUERY_HISTORY_KEY, existing.slice(0, MAX_QUERY_HISTORY));
  }

  // ---- Abrir / ejecutar resultados ----

  private async handleAccept(id: string, query: string): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item) {
      return;
    }
    await this.openItem(item);
    this.recordRecent(item);
    void this.pushQueryHistory(query);
  }

  private async openItem(item: InternalItem): Promise<void> {
    if (item.kind === "file") {
      await vscode.window.showTextDocument(item.uri, { preview: true });
      return;
    }
    if (item.kind === "text") {
      const pos = new vscode.Position(Math.max(0, item.line - 1), Math.max(0, item.column - 1));
      const editor = await vscode.window.showTextDocument(item.uri, { preview: true });
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      return;
    }
    if (item.kind === "command") {
      await vscode.commands.executeCommand(item.commandId);
      return;
    }
    if (item.kind === "setting") {
      await vscode.commands.executeCommand("workbench.action.openSettings", item.settingId);
      return;
    }
    const editor = await vscode.window.showTextDocument(item.symbol.location.uri, { preview: true });
    editor.selection = new vscode.Selection(
      item.symbol.location.range.start,
      item.symbol.location.range.start
    );
    editor.revealRange(item.symbol.location.range, vscode.TextEditorRevealType.InCenter);
  }

  private async handleShowImplementations(id: string): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item || item.kind !== "symbol" || !this.view) {
      return;
    }
    void this.view.webview.postMessage({ type: "busy", value: true });
    try {
      const implementations = await findImplementations(
        item.symbol.location.uri,
        item.symbol.location.range.start
      );
      if (implementations.length === 0) {
        vscode.window.showInformationMessage(
          `No se encontraron implementaciones para "${item.symbol.name}".`
        );
        return;
      }
      const picked = await vscode.window.showQuickPick(
        implementations.map((loc) => ({
          label: `$(symbol-method) ${toWorkspaceRelativePath(loc.uri)}`,
          description: `línea ${loc.range.start.line + 1}`,
          location: loc,
        })),
        { title: `Implementaciones de "${item.symbol.name}"`, matchOnDescription: true }
      );
      if (!picked) {
        return;
      }
      const editor = await vscode.window.showTextDocument(picked.location.uri, { preview: true });
      editor.selection = new vscode.Selection(
        picked.location.range.start,
        picked.location.range.start
      );
      editor.revealRange(picked.location.range, vscode.TextEditorRevealType.InCenter);
    } finally {
      void this.view?.webview.postMessage({ type: "busy", value: false });
    }
  }
}
