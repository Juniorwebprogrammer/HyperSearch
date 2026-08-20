/**
 * Marcado/estilos/JS de la vista "HyperSearch". Todo inline (sin
 * recursos externos) para no necesitar localResourceRoots ni relajar la CSP
 * más de lo imprescindible. Pensado para vivir en el sidebar (ancho angosto,
 * ~250-450px, sin control sobre la altura disponible), no como diálogo
 * centrado flotante.
 */
export function getWebviewHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<title>HyperSearch</title>
<style>
  html, body { height: 100%; margin: 0; padding: 0; }
  body {
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size, 13px);
    overflow: hidden;
    user-select: none;
  }
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .search-row {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128, 128, 128, 0.25));
    flex-shrink: 0;
  }
  .search-icon { opacity: 0.65; margin-right: 6px; font-size: 13px; flex-shrink: 0; }
  #searchInput {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font-size: 13px;
    font-family: inherit;
  }
  .spinner {
    width: 12px; height: 12px; margin-left: 6px; flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid var(--vscode-descriptionForeground);
    border-top-color: transparent;
    animation: spin 0.7s linear infinite;
    visibility: hidden;
  }
  .spinner.busy { visibility: visible; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tabs {
    display: flex;
    gap: 2px;
    padding: 0 4px;
    overflow-x: auto;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128, 128, 128, 0.25));
    flex-shrink: 0;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { height: 0; }
  .tab {
    background: none;
    border: none;
    color: var(--vscode-descriptionForeground);
    padding: 6px 7px;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    flex-shrink: 0;
  }
  .tab:hover { color: var(--vscode-foreground); }
  .tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder, #4aa8e0); }
  .options-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128, 128, 128, 0.25));
    flex-shrink: 0;
  }
  .options-row.hidden { display: none; }
  #scopeSelect {
    flex: 1;
    min-width: 0;
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    border: 1px solid var(--vscode-dropdown-border, transparent);
    border-radius: 2px;
    font-size: 11px;
    font-family: inherit;
    padding: 2px 2px;
  }
  #scopeSelect.hidden { visibility: hidden; }
  .toggle-group { display: flex; gap: 2px; flex-shrink: 0; }
  .toggle-group.hidden { display: none; }
  .toggle-btn {
    width: 22px;
    height: 20px;
    font-size: 10px;
    font-family: inherit;
    border: 1px solid transparent;
    border-radius: 3px;
    background: none;
    color: var(--vscode-input-foreground);
    cursor: pointer;
  }
  .toggle-btn:hover { background: rgba(128, 128, 128, 0.15); }
  .toggle-btn.active {
    background: var(--vscode-inputOption-activeBackground, rgba(0, 122, 204, 0.4));
    border-color: var(--vscode-inputOption-activeBorder, transparent);
    color: var(--vscode-inputOption-activeForeground, inherit);
  }
  .results { flex: 1; overflow-y: auto; padding: 2px 0; }
  .group-header {
    padding: 6px 8px 2px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-descriptionForeground);
  }
  .item {
    display: flex;
    flex-direction: column;
    padding: 4px 8px;
    cursor: pointer;
    border-left: 2px solid transparent;
  }
  .item.selected {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
    border-left-color: var(--vscode-focusBorder, #4aa8e0);
  }
  .item-main { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .item-icon { width: 15px; text-align: center; flex-shrink: 0; font-size: 12px; }
  .badge {
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border-radius: 3px;
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-name mark {
    background: transparent;
    color: var(--vscode-list-highlightForeground, #4fc1ff);
    font-weight: 700;
  }
  .item.selected .item-name mark { color: inherit; text-decoration: underline; }
  .item-path {
    margin-left: 21px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item.selected .item-path { color: inherit; opacity: 0.85; }
  .impl-btn {
    margin-left: auto;
    flex-shrink: 0;
    border: none;
    background: none;
    color: inherit;
    opacity: 0.55;
    cursor: pointer;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .impl-btn:hover { opacity: 1; background: rgba(128, 128, 128, 0.2); }
  .empty, .loading {
    padding: 20px 10px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
  }
  .footer {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    padding: 5px 8px;
    border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128, 128, 128, 0.25));
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
  }
  .footer kbd {
    font-family: inherit;
    background: rgba(128, 128, 128, 0.18);
    border-radius: 3px;
    padding: 1px 4px;
    margin-right: 3px;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="search-row">
      <span class="search-icon">🔍</span>
      <input id="searchInput" type="text" placeholder="Buscar en todo el proyecto..." autocomplete="off" spellcheck="false" />
      <div id="spinner" class="spinner"></div>
    </div>
    <div class="tabs" id="tabs">
      <button class="tab active" data-tab="all">All</button>
      <button class="tab" data-tab="file">Files</button>
      <button class="tab" data-tab="symbol">Symbols</button>
      <button class="tab" data-tab="text">Text</button>
      <button class="tab" data-tab="action">Actions</button>
    </div>
    <div class="options-row" id="scopeRow">
      <select id="scopeSelect" title="Alcance de la búsqueda">
        <option value="all">Todo el proyecto</option>
        <option value="currentFile">Archivo actual</option>
        <option value="openTabs">Pestañas abiertas</option>
        <option value="gitChanges">Cambios de git</option>
      </select>
      <div class="toggle-group" id="textOptionsGroup">
        <button class="toggle-btn" data-opt="regex" title="Usar expresión regular">.*</button>
        <button class="toggle-btn" data-opt="caseSensitive" title="Sensible a mayúsculas/minúsculas">Aa</button>
        <button class="toggle-btn" data-opt="wholeWord" title="Solo palabra completa">"ab"</button>
      </div>
    </div>
    <div class="results" id="results"></div>
    <div class="footer">
      <span><kbd>↑↓</kbd>navegar</span>
      <span><kbd>Enter</kbd>abrir</span>
      <span><kbd>Tab</kbd>pestaña</span>
      <span><kbd>Ctrl+↑↓</kbd>historial</span>
    </div>
  </div>
<script nonce="${nonce}">
(function () {
  const vscode = acquireVsCodeApi();
  const TABS = ["all", "file", "symbol", "text", "action"];
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const spinnerEl = document.getElementById("spinner");
  const tabButtons = Array.from(document.querySelectorAll(".tab"));
  const scopeRow = document.getElementById("scopeRow");
  const scopeSelect = document.getElementById("scopeSelect");
  const textOptionsGroup = document.getElementById("textOptionsGroup");
  const toggleButtons = Array.from(document.querySelectorAll(".toggle-btn"));

  let currentTab = "all";
  let textOptions = { regex: false, caseSensitive: false, wholeWord: false };
  let seq = 0;
  let expectedSeq = 0;
  let debounceTimer;
  /** ids en orden de render, para navegación con flechas. */
  let flatIds = [];
  let kindById = new Map();
  let selectedIndex = -1;
  let queryHistory = [];
  let historyPointer = -1;

  function setBusy(busy) {
    spinnerEl.classList.toggle("busy", busy);
  }

  function requestSearch(immediate) {
    clearTimeout(debounceTimer);
    const run = () => {
      seq += 1;
      expectedSeq = seq;
      setBusy(true);
      vscode.postMessage({
        type: "search",
        tab: currentTab,
        query: input.value,
        seq,
        scope: scopeSelect.value,
        textOptions,
      });
    };
    if (immediate) {
      run();
    } else {
      debounceTimer = setTimeout(run, 150);
    }
  }

  function updateOptionsVisibility() {
    scopeSelect.classList.toggle("hidden", currentTab === "action");
    textOptionsGroup.classList.toggle("hidden", !(currentTab === "text" || currentTab === "all"));
  }

  function switchTab(tab) {
    if (tab === currentTab) return;
    currentTab = tab;
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    updateOptionsVisibility();
    requestSearch(true);
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  scopeSelect.addEventListener("change", () => requestSearch(true));

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const opt = btn.dataset.opt;
      textOptions[opt] = !textOptions[opt];
      btn.classList.toggle("active", textOptions[opt]);
      requestSearch(true);
    });
  });

  function cycleTab(delta) {
    const idx = TABS.indexOf(currentTab);
    const next = (idx + delta + TABS.length) % TABS.length;
    switchTab(TABS[next]);
  }

  function cycleQueryHistory(delta) {
    if (queryHistory.length === 0) return;
    if (delta > 0) {
      // Más viejo.
      historyPointer = Math.min(queryHistory.length - 1, historyPointer + 1);
    } else {
      // Más nuevo, hasta volver a vaciar el input.
      if (historyPointer <= 0) {
        historyPointer = -1;
        input.value = "";
        requestSearch(true);
        return;
      }
      historyPointer -= 1;
    }
    input.value = queryHistory[historyPointer];
    requestSearch(true);
  }

  function updateSelection() {
    const rows = resultsEl.querySelectorAll(".item");
    rows.forEach((row, i) => row.classList.toggle("selected", i === selectedIndex));
    const active = rows[selectedIndex];
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function moveSelection(delta) {
    if (flatIds.length === 0) return;
    selectedIndex = Math.max(0, Math.min(flatIds.length - 1, selectedIndex + delta));
    updateSelection();
  }

  function acceptSelected() {
    const id = flatIds[selectedIndex];
    if (!id) return;
    vscode.postMessage({ type: "accept", id, query: input.value });
  }

  function triggerImplementations() {
    const id = flatIds[selectedIndex];
    if (!id || kindById.get(id) !== "symbol") return;
    vscode.postMessage({ type: "showImplementations", id });
  }

  function renderGroups(groups, tab) {
    resultsEl.innerHTML = "";
    flatIds = [];
    kindById = new Map();

    const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
    if (totalItems === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = input.value.trim().length === 0
        ? "Escribe para buscar…"
        : "Sin resultados.";
      resultsEl.appendChild(empty);
      selectedIndex = -1;
      return;
    }

    const showHeaders = groups.length > 1;
    for (const group of groups) {
      if (group.items.length === 0) continue;
      if (showHeaders) {
        const header = document.createElement("div");
        header.className = "group-header";
        header.textContent = group.label;
        resultsEl.appendChild(header);
      }
      for (const item of group.items) {
        const row = document.createElement("div");
        row.className = "item";
        row.dataset.id = item.id;
        row.title = item.path ? item.path : "";

        const main = document.createElement("div");
        main.className = "item-main";

        const icon = document.createElement("span");
        icon.innerHTML = item.iconHtml;
        main.appendChild(icon.firstElementChild || icon);

        const name = document.createElement("span");
        name.className = "item-name";
        name.innerHTML = item.nameHtml;
        main.appendChild(name);

        if (item.kind === "symbol") {
          const implBtn = document.createElement("button");
          implBtn.className = "impl-btn";
          implBtn.title = "Mostrar implementaciones";
          implBtn.textContent = "impl";
          implBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            vscode.postMessage({ type: "showImplementations", id: item.id });
          });
          main.appendChild(implBtn);
        }

        row.appendChild(main);

        if (item.path) {
          const path = document.createElement("div");
          path.className = "item-path";
          path.textContent = item.path;
          row.appendChild(path);
        }

        row.addEventListener("click", () => {
          vscode.postMessage({ type: "accept", id: item.id, query: input.value });
        });
        row.addEventListener("mouseenter", () => {
          selectedIndex = flatIds.indexOf(item.id);
          updateSelection();
        });

        resultsEl.appendChild(row);
        flatIds.push(item.id);
        kindById.set(item.id, item.kind);
      }
    }
    selectedIndex = flatIds.length > 0 ? 0 : -1;
    updateSelection();
  }

  input.addEventListener("input", () => {
    historyPointer = -1;
    requestSearch(false);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      vscode.postMessage({ type: "close" });
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      cycleQueryHistory(e.key === "ArrowUp" ? 1 : -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.altKey) {
        triggerImplementations();
      } else {
        acceptSelected();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      cycleTab(e.shiftKey ? -1 : 1);
    }
  });

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.type === "results") {
      if (msg.seq !== expectedSeq) return;
      setBusy(false);
      renderGroups(msg.groups, msg.tab);
    } else if (msg.type === "busy") {
      setBusy(msg.value);
    } else if (msg.type === "history") {
      queryHistory = msg.queries || [];
      historyPointer = -1;
    } else if (msg.type === "focus") {
      input.focus();
      input.select();
    }
  });

  updateOptionsVisibility();
  input.focus();
  vscode.postMessage({ type: "ready" });
  requestSearch(true);
})();
</script>
</body>
</html>`;
}
