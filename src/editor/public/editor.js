import { json } from "https://esm.sh/@codemirror/lang-json";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const INTERNAL_BEHAVIOR_TEMPLATE = "__behaviorTemplate";
const INTERNAL_RESPONSES_TEMPLATE = "__responsesTemplate";

const DEFAULT_ENDPOINT = () => ({
  method: "get",
  path: "/new-endpoint",
  name: "New Endpoint",
  successRate: 100,
  delay: 0,
  success: {
    statusCode: 200,
    body: {
      status: "success",
      data: {},
    },
  },
  errors: [],
});

const DEFAULT_ERROR = () => ({
  statusCode: 500,
  body: {
    status: "failed",
    message: "New error",
    error_code: "ERROR_CODE",
  },
});

const refs = {
  endpointList: document.getElementById("endpoint-list"),
  addEndpointButton: document.getElementById("add-endpoint"),
  endpointName: document.getElementById("endpoint-name"),
  endpointMethodBadge: document.getElementById("endpoint-method-badge"),
  endpointRouteText: document.getElementById("endpoint-route-text"),
  endpointControls: document.getElementById("endpoint-controls"),
  successRate: document.getElementById("success-rate"),
  delayInput: document.getElementById("delay-input"),
  tabs: document.getElementById("tabs"),
  prettifyButton: document.getElementById("prettify-button"),
  editorContainer: document.getElementById("editor-container"),
  editorTitle: document.getElementById("editor-title"),
  editorSubtitle: document.getElementById("editor-subtitle"),
  emptyState: document.getElementById("empty-state"),
  status: document.getElementById("status"),
  endpointEditModal: document.getElementById("endpoint-edit-modal"),
  endpointEditForm: document.getElementById("endpoint-edit-form"),
  endpointEditName: document.getElementById("endpoint-edit-name"),
  endpointEditMethod: document.getElementById("endpoint-edit-method"),
  endpointEditPath: document.getElementById("endpoint-edit-path"),
  endpointEditTitle: document.getElementById("endpoint-edit-title"),
  endpointEditNameError: document.getElementById("endpoint-edit-name-error"),
  endpointEditPathError: document.getElementById("endpoint-edit-path-error"),
  endpointModalClose: document.getElementById("endpoint-modal-close"),
  endpointModalCancel: document.getElementById("endpoint-modal-cancel"),
  endpointModalSave: document.getElementById("endpoint-modal-save"),
};

const customTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "var(--text)",
  },
  ".cm-scroller": {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  ".cm-content": {
    padding: "18px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--muted)",
    borderRight: "1px solid var(--border-soft)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--accent-soft)",
  },
});

let config = {};
let endpoints = [];
let activeIndex = -1;
let activeTab = "success";
let activeErrorIndex = 0;
let openMenuIndex = null;
let endpointModalMode = null;
let editingEndpointIndex = null;
let jsonEditor = null;
let ignoreEditorChanges = false;
let syncTimer = null;
let editorTimer = null;
let statusTimer = null;
let saveQueue = Promise.resolve();

init().catch((error) => {
  console.error("Failed to load editor:", error);
  showStatus("Failed to load config", true);
});

async function init() {
  const response = await fetch("/__config");
  config = await response.json();
  endpoints = parseConfig(config);
  activeIndex = endpoints.length > 0 ? 0 : -1;

  bindEvents();
  closeEndpointModal();
  renderSidebar();
  renderMain();
}

function parseConfig(sourceConfig) {
  const parsedEndpoints = [];

  for (const [key, value] of Object.entries(sourceConfig || {})) {
    if (Array.isArray(value)) {
      for (const route of value) {
        const [path, routeConfig] = Object.entries(route || {})[0] || [];
        if (!path || !routeConfig || typeof routeConfig !== "object") continue;

        parsedEndpoints.push(parseLegacyEndpoint(key, path, routeConfig));
      }
      continue;
    }

    if (!value || typeof value !== "object") continue;

    const parsedKey = parseMockKey(key);
    if (!parsedKey) continue;

    parsedEndpoints.push(parseFlatEndpoint(parsedKey.method, parsedKey.path, value));
  }

  return parsedEndpoints;
}

function buildConfig(sourceEndpoints) {
  const nextConfig = {};

  sourceEndpoints.forEach((endpoint) => {
    const method = normalizeMethod(endpoint.method);
    const path = normalizePath(endpoint.path) || "/new-endpoint";
    const {
      method: _method,
      path: _path,
      successRate,
      delay,
      success,
      errors,
      ...fields
    } = endpoint;

    const behaviorTemplate = cloneValue(endpoint[INTERNAL_BEHAVIOR_TEMPLATE] || {});
    const responsesTemplate = cloneValue(endpoint[INTERNAL_RESPONSES_TEMPLATE] || {});

    nextConfig[buildMockKey(method, path)] = {
      ...cloneValue(fields),
      name: normalizeEndpointName(fields.name, path),
      behavior: {
        ...behaviorTemplate,
        successRate: successRate ?? 100,
        delay: delay ?? 0,
      },
      responses: {
        ...responsesTemplate,
        success: cloneValue(success ?? {}),
        errors: Array.isArray(errors) ? cloneValue(errors) : [],
      },
    };
  });

  return nextConfig;
}

function bindEvents() {
  refs.addEndpointButton.addEventListener("click", () => {
    closeEndpointMenu({ rerender: false });
    openEndpointModal("create");
  });

  refs.successRate.addEventListener("input", () => {
    updateSuccessRateFromInput();
  });

  refs.successRate.addEventListener("change", () => {
    updateSuccessRateFromInput({ commitEmpty: true });
  });

  refs.delayInput.addEventListener("input", () => {
    updateDelayFromInput();
  });

  refs.delayInput.addEventListener("change", () => {
    updateDelayFromInput({ commitEmpty: true });
  });

  refs.prettifyButton.addEventListener("click", () => {
    void prettifyActiveEditor();
  });

  refs.endpointEditForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveEndpointEdit();
  });

  refs.endpointModalClose.addEventListener("click", closeEndpointModal);
  refs.endpointModalCancel.addEventListener("click", closeEndpointModal);
  refs.endpointModalSave.addEventListener("click", () => {
    void saveEndpointEdit();
  });

  refs.endpointEditModal.addEventListener("click", (event) => {
    if (event.target === refs.endpointEditModal) {
      closeEndpointModal();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-trigger") && !event.target.closest(".endpoint-menu")) {
      closeEndpointMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (!refs.endpointEditModal.hidden) {
      closeEndpointModal();
      return;
    }

    closeEndpointMenu();
  });
}

function updateSuccessRateFromInput(options = {}) {
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;

  const fallback = endpoint.successRate ?? 100;
  if (!options.commitEmpty && isEmptyInputValue(refs.successRate.value)) return;

  const nextValue = Math.round(
    clampNumber(refs.successRate.value, 0, 100, fallback),
  );
  endpoint.successRate = nextValue;
  refs.successRate.value = String(nextValue);
  scheduleSync();
}

function updateDelayFromInput(options = {}) {
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;

  if (!options.commitEmpty && isEmptyInputValue(refs.delayInput.value)) return;

  const nextValue = clampNumber(refs.delayInput.value, 0, Infinity, 0);
  endpoint.delay = nextValue;
  refs.delayInput.value = String(nextValue);
  scheduleSync();
}

function renderSidebar() {
  refs.endpointList.innerHTML = "";

  if (endpoints.length === 0) {
    const empty = document.createElement("div");
    empty.className = "sidebar-empty";

    const title = document.createElement("h3");
    title.textContent = "No endpoints yet";

    const copy = document.createElement("p");
    copy.textContent = "Add one to start mocking APIs.";

    empty.append(title, copy);
    refs.endpointList.appendChild(empty);
    return;
  }

  endpoints.forEach((endpoint, index) => {
    const item = document.createElement("div");
    item.className = "endpoint-item";
    if (index === activeIndex) item.classList.add("active");
    item.addEventListener("click", () => {
      openMenuIndex = null;
      activeIndex = index;
      if (activeTab === "error") {
        activeErrorIndex = clampErrorIndex(getActiveEndpoint());
      }
      renderSidebar();
      renderMain();
    });

    const main = document.createElement("div");
    main.className = "endpoint-card-main";

    const methodBadge = document.createElement("span");
    setMethodBadge(methodBadge, endpoint.method);

    const text = document.createElement("div");
    text.className = "endpoint-card-text";

    const title = document.createElement("div");
    title.className = "endpoint-card-title";
    title.textContent = normalizeEndpointName(endpoint.name, endpoint.path);

    const path = document.createElement("div");
    path.className = "endpoint-path";
    path.textContent = endpoint.path;

    text.append(title, path);

    const top = document.createElement("div");
    top.className = "endpoint-card-top";
    top.append(methodBadge, text);

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "menu-trigger";
    if (openMenuIndex === index) menuButton.classList.add("is-open");
    menuButton.setAttribute("aria-label", "Open endpoint actions");
    menuButton.textContent = "⋮";
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openEndpointMenu(index, menuButton);
    });

    main.appendChild(top);
    item.append(main, menuButton);

    if (openMenuIndex === index) {
      item.appendChild(createEndpointMenu(index));
    }

    refs.endpointList.appendChild(item);
  });
}

function openEndpointMenu(endpointIndex, anchorElement) {
  const nextIndex = openMenuIndex === endpointIndex ? null : endpointIndex;
  openMenuIndex = nextIndex;

  if (anchorElement) {
    anchorElement.classList.toggle("is-open", nextIndex === endpointIndex);
  }

  renderSidebar();
}

function closeEndpointMenu(options = {}) {
  if (openMenuIndex === null) return;

  openMenuIndex = null;

  if (options.rerender !== false) {
    renderSidebar();
  }
}

function createEndpointMenu(endpointIndex) {
  const menu = document.createElement("div");
  menu.className = "endpoint-menu";
  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Edit endpoint";
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openEndpointModal("edit", endpointIndex);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-item";
  deleteButton.textContent = "Delete endpoint";
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeEndpointMenu({ rerender: false });
    deleteEndpoint(endpointIndex);
  });

  menu.append(editButton, deleteButton);
  return menu;
}

function openEndpointEditModal(endpointIndex) {
  const endpoint = endpoints[endpointIndex];
  if (!endpoint) return;

  endpointModalMode = "edit";
  editingEndpointIndex = endpointIndex;
  closeEndpointMenu({ rerender: true });
  clearEndpointEditErrors();

  refs.endpointEditTitle.textContent = "Edit endpoint";
  refs.endpointModalSave.textContent = "Save changes";
  refs.endpointEditName.value = normalizeEndpointName(endpoint.name, endpoint.path);
  refs.endpointEditMethod.value = endpoint.method;
  refs.endpointEditPath.value = endpoint.path;
  refs.endpointEditModal.hidden = false;

  queueMicrotask(() => {
    refs.endpointEditName.focus();
    refs.endpointEditName.select();
  });
}

function openEndpointCreateModal() {
  endpointModalMode = "create";
  editingEndpointIndex = null;
  closeEndpointMenu({ rerender: true });
  clearEndpointEditErrors();

  const endpoint = DEFAULT_ENDPOINT();
  refs.endpointEditTitle.textContent = "Add endpoint";
  refs.endpointModalSave.textContent = "Save changes";
  refs.endpointEditName.value = endpoint.name;
  refs.endpointEditMethod.value = endpoint.method;
  refs.endpointEditPath.value = endpoint.path;
  refs.endpointEditModal.hidden = false;

  queueMicrotask(() => {
    refs.endpointEditName.focus();
    refs.endpointEditName.select();
  });
}

function openEndpointModal(mode, endpointIndex = null) {
  if (mode === "create") {
    openEndpointCreateModal();
    return;
  }

  if (mode === "edit" && endpointIndex !== null) {
    openEndpointEditModal(endpointIndex);
  }
}

function closeEndpointModal() {
  endpointModalMode = null;
  editingEndpointIndex = null;
  refs.endpointEditModal.hidden = true;
  refs.endpointEditTitle.textContent = "Edit endpoint";
  refs.endpointModalSave.textContent = "Save changes";
  refs.endpointEditName.value = "";
  refs.endpointEditMethod.value = "get";
  refs.endpointEditPath.value = "";
  clearEndpointEditErrors();
}

async function saveEndpointEdit() {
  const nextName = refs.endpointEditName.value.trim();
  const nextMethod = refs.endpointEditMethod.value.toLowerCase();
  const rawPath = refs.endpointEditPath.value.trim();
  const nextPath = normalizePath(rawPath);

  let hasError = false;

  if (!nextName) {
    refs.endpointEditNameError.hidden = false;
    hasError = true;
  } else {
    refs.endpointEditNameError.hidden = true;
  }

  if (!rawPath || !rawPath.startsWith("/")) {
    refs.endpointEditPathError.hidden = false;
    hasError = true;
  } else {
    refs.endpointEditPathError.hidden = true;
  }

  if (hasError) return;

  if (endpointModalMode === "create") {
    endpoints.push({
      ...DEFAULT_ENDPOINT(),
      name: nextName,
      method: HTTP_METHODS.includes(nextMethod) ? nextMethod : "get",
      path: nextPath,
    });
    activeIndex = endpoints.length - 1;
    activeTab = "success";
    activeErrorIndex = 0;
  } else {
    if (editingEndpointIndex === null) return;

    const endpoint = endpoints[editingEndpointIndex];
    if (!endpoint) return;

    endpoint.name = nextName;
    endpoint.method = HTTP_METHODS.includes(nextMethod) ? nextMethod : "get";
    endpoint.path = nextPath;
  }

  renderSidebar();
  renderMain();
  closeEndpointModal();
  await syncConfig("Endpoint updated");
}

function clearEndpointEditErrors() {
  refs.endpointEditNameError.hidden = true;
  refs.endpointEditPathError.hidden = true;
}

function renderMain() {
  const endpoint = getActiveEndpoint();

  if (endpoint) {
    endpoint.errors = Array.isArray(endpoint.errors) ? endpoint.errors : [];
    if (activeTab === "error" && endpoint.errors.length === 0) {
      activeTab = "success";
    }
    activeErrorIndex = clampErrorIndex(endpoint);
  }

  renderEndpointOverview(endpoint);
  renderEndpointControls(endpoint);
  renderResponseEditor(endpoint);
}

function renderEndpointOverview(endpoint) {
  if (!endpoint) {
    refs.endpointName.textContent = "No endpoint selected";
    setMethodBadge(refs.endpointMethodBadge, "get");
    refs.endpointRouteText.textContent = "/";
    return;
  }

  refs.endpointName.textContent = normalizeEndpointName(endpoint.name, endpoint.path);
  setMethodBadge(refs.endpointMethodBadge, endpoint.method);
  refs.endpointRouteText.textContent = endpoint.path;
}

function renderEndpointControls(endpoint) {
  const hasEndpoint = Boolean(endpoint);

  refs.endpointControls.hidden = !hasEndpoint;
  refs.successRate.disabled = !hasEndpoint;
  refs.delayInput.disabled = !hasEndpoint;

  if (!endpoint) {
    refs.successRate.value = "100";
    refs.delayInput.value = "0";
    return;
  }

  refs.successRate.value = String(endpoint.successRate ?? 100);
  refs.delayInput.value = String(endpoint.delay ?? 0);
}

function renderResponseEditor(endpoint) {
  const hasEndpoint = Boolean(endpoint);

  refs.emptyState.hidden = hasEndpoint;
  refs.prettifyButton.disabled = !hasEndpoint;
  refs.tabs.innerHTML = "";

  if (!endpoint) {
    refs.editorTitle.textContent = "Response Body";
    refs.editorSubtitle.textContent = "Add an endpoint to start editing JSON.";
    destroyEditor();
    refs.editorContainer.hidden = true;
    return;
  }

  renderTabs(endpoint);
  createOrRefreshEditor(getActiveResponseContent(endpoint));
}

function renderTabs(endpoint) {
  refs.tabs.innerHTML = "";

  const successTab = createButton("Success", "tab");
  successTab.classList.toggle("active", activeTab === "success");
  successTab.addEventListener("click", () => {
    if (activeTab === "success") return;
    activeTab = "success";
    renderTabs(endpoint);
    createOrRefreshEditor(getActiveResponseContent(endpoint));
  });
  refs.tabs.appendChild(successTab);

  endpoint.errors.forEach((_, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab-button";
    if (activeTab === "error" && activeErrorIndex === index) {
      tab.classList.add("active");
    }
    tab.addEventListener("click", () => {
      activeTab = "error";
      activeErrorIndex = index;
      renderTabs(endpoint);
      createOrRefreshEditor(getActiveResponseContent(endpoint));
    });

    const label = document.createElement("span");
    label.textContent = `Error ${index + 1}`;

    const remove = document.createElement("span");
    remove.className = "tab-remove";
    remove.textContent = "x";
    remove.title = "Delete error response";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteError(index);
    });

    tab.append(label, remove);
    refs.tabs.appendChild(tab);
  });

  const addButton = createButton("+", "tab add-tab");
  addButton.title = "Add error response";
  addButton.addEventListener("click", () => addError());
  refs.tabs.appendChild(addButton);
}

function createOrRefreshEditor(content) {
  refs.editorContainer.hidden = false;
  refs.editorTitle.textContent =
    activeTab === "success" ? "Success response" : `Error ${activeErrorIndex + 1}`;
  refs.editorSubtitle.textContent =
    activeTab === "success"
      ? "Edit the JSON returned for successful requests."
      : "Edit the JSON returned for this error response.";

  destroyEditor();

  jsonEditor = new EditorView({
    doc: JSON.stringify(content, null, 2),
    parent: refs.editorContainer,
    extensions: [
      basicSetup,
      json(),
      oneDark,
      customTheme,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || ignoreEditorChanges) return;
        debounceEditorSave();
      }),
    ],
  });
}

function debounceEditorSave() {
  clearTimeout(editorTimer);
  editorTimer = setTimeout(() => {
    void saveEditorJson();
  }, 500);
}

async function saveEditorJson() {
  if (!jsonEditor) return;

  try {
    const parsed = JSON.parse(jsonEditor.state.doc.toString());
    const endpoint = getActiveEndpoint();
    if (!endpoint) return;

    applyActiveEditorValue(endpoint, parsed);
    scheduleSync();
  } catch (error) {
    console.error("Invalid JSON:", error);
    showStatus("Invalid JSON", true);
  }
}

async function prettifyActiveEditor() {
  if (!jsonEditor) return;

  try {
    const parsed = JSON.parse(jsonEditor.state.doc.toString());
    const formatted = JSON.stringify(parsed, null, 2);
    const endpoint = getActiveEndpoint();
    if (!endpoint) return;

    ignoreEditorChanges = true;
    jsonEditor.dispatch({
      changes: {
        from: 0,
        to: jsonEditor.state.doc.length,
        insert: formatted,
      },
    });
    ignoreEditorChanges = false;

    applyActiveEditorValue(endpoint, parsed);
    await syncConfig("Prettified");
  } catch (error) {
    console.error("Invalid JSON:", error);
    ignoreEditorChanges = false;
    showStatus("Invalid JSON", true);
  }
}

function applyActiveEditorValue(endpoint, parsed) {
  if (activeTab === "success") {
    endpoint.success = parsed;
  } else {
    endpoint.errors[activeErrorIndex] = parsed;
  }
}

function addError() {
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;

  endpoint.errors = Array.isArray(endpoint.errors) ? endpoint.errors : [];
  endpoint.errors.push(DEFAULT_ERROR());
  activeTab = "error";
  activeErrorIndex = endpoint.errors.length - 1;
  renderEndpointOverview(endpoint);
  renderTabs(endpoint);
  createOrRefreshEditor(getActiveResponseContent(endpoint));
  scheduleSync("Saved");
}

function deleteError(index) {
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;

  endpoint.errors.splice(index, 1);

  if (endpoint.errors.length === 0) {
    activeTab = "success";
    activeErrorIndex = 0;
  } else {
    activeTab = "error";
    if (activeErrorIndex > index) {
      activeErrorIndex -= 1;
    } else if (activeErrorIndex >= endpoint.errors.length) {
      activeErrorIndex = endpoint.errors.length - 1;
    }
  }

  renderTabs(endpoint);
  renderEndpointOverview(endpoint);
  createOrRefreshEditor(getActiveResponseContent(endpoint));
  scheduleSync("Saved");
}

function deleteEndpoint(index) {
  if (!confirm("Delete this endpoint?")) return;

  endpoints.splice(index, 1);
  closeEndpointMenu({ rerender: false });

  if (endpoints.length === 0) {
    activeIndex = -1;
    activeTab = "success";
    activeErrorIndex = 0;
  } else if (activeIndex === index) {
    activeIndex = Math.min(index, endpoints.length - 1);
    activeTab = "success";
    activeErrorIndex = 0;
  } else if (activeIndex > index) {
    activeIndex -= 1;
  }

  renderSidebar();
  renderMain();
  scheduleSync("Endpoint deleted");
}

function scheduleSync(successMessage = "Saved") {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncConfig(successMessage);
  }, 400);
}

async function syncConfig(successMessage = "Saved") {
  clearTimeout(syncTimer);
  config = buildConfig(endpoints);
  const payload = JSON.stringify(config);

  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      const response = await fetch("/__config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Config save failed: ${response.status}`);
      }

      showStatus(successMessage, false);
    })
    .catch((error) => {
      console.error("Save failed:", error);
      showStatus("Save failed", true);
    });

  return saveQueue;
}

function showStatus(message, isError) {
  clearTimeout(statusTimer);
  refs.status.textContent = message;
  refs.status.className = `status-toast ${isError ? "error" : "ok"} visible`;

  statusTimer = setTimeout(() => {
    refs.status.classList.remove("visible");
  }, 2200);
}

function destroyEditor() {
  clearTimeout(editorTimer);

  if (jsonEditor) {
    jsonEditor.destroy();
    jsonEditor = null;
  }

  refs.editorContainer.innerHTML = "";
}

function getActiveEndpoint() {
  return activeIndex >= 0 ? endpoints[activeIndex] : null;
}

function getActiveResponseContent(endpoint) {
  if (activeTab === "success") {
    return endpoint.success ?? {};
  }

  return endpoint.errors[activeErrorIndex] ?? DEFAULT_ERROR();
}

function clampErrorIndex(endpoint) {
  if (!endpoint || !endpoint.errors?.length) return 0;
  return Math.max(0, Math.min(activeErrorIndex, endpoint.errors.length - 1));
}

function clampNumber(value, min, max, fallback) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return fallback;

  const number = Number(rawValue);
  if (!Number.isFinite(number)) return fallback;

  const lowerBounded = Math.max(min, number);
  return Number.isFinite(max) ? Math.min(max, lowerBounded) : lowerBounded;
}

function isEmptyInputValue(value) {
  return String(value ?? "").trim() === "";
}

function parseFlatEndpoint(method, path, routeConfig) {
  const cloned = cloneValue(routeConfig);
  const { behavior = {}, responses = {}, ...fields } = cloned;
  const normalizedPath = normalizePath(path) || path;

  const endpoint = {
    ...fields,
    method: normalizeMethod(method),
    path: normalizedPath,
    name: normalizeEndpointName(fields.name, normalizedPath),
    successRate: behavior.successRate ?? 100,
    delay: behavior.delay ?? 0,
    success: cloneValue(responses.success ?? {}),
    errors: Array.isArray(responses.errors) ? cloneValue(responses.errors) : [],
  };

  setInternalTemplate(endpoint, INTERNAL_BEHAVIOR_TEMPLATE, behavior);
  setInternalTemplate(endpoint, INTERNAL_RESPONSES_TEMPLATE, responses);

  return endpoint;
}

function parseLegacyEndpoint(method, path, routeConfig) {
  const cloned = cloneValue(routeConfig);
  const normalizedPath = normalizePath(path) || path;
  const endpoint = {
    ...cloned,
    method: normalizeMethod(method),
    path: normalizedPath,
    name: normalizeEndpointName(cloned.name, normalizedPath),
    successRate: cloned.successRate ?? 100,
    delay: cloned.delay ?? 0,
    success: cloneValue(cloned.success ?? {}),
    errors: Array.isArray(cloned.errors) ? cloneValue(cloned.errors) : [],
  };

  setInternalTemplate(endpoint, INTERNAL_BEHAVIOR_TEMPLATE, {});
  setInternalTemplate(endpoint, INTERNAL_RESPONSES_TEMPLATE, {});

  return endpoint;
}

function parseMockKey(key) {
  const match = /^([A-Z]+)\s+(.+)$/.exec(String(key || "").trim());
  if (!match) return null;

  return {
    method: match[1].toLowerCase(),
    path: normalizePath(match[2]),
  };
}

function buildMockKey(method, path) {
  return `${normalizeMethod(method).toUpperCase()} ${normalizePath(path)}`;
}

function normalizeMethod(method) {
  const nextMethod = String(method || "get").toLowerCase();
  return HTTP_METHODS.includes(nextMethod) ? nextMethod : "get";
}

function normalizePath(path) {
  const trimmed = String(path || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeEndpointName(name, path) {
  const trimmed = (name || "").trim();
  if (trimmed) return trimmed;

  const derived = deriveEndpointName(path);
  return derived || path || "Untitled Endpoint";
}

function deriveEndpointName(path) {
  const segments = String(path || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^:/, ""))
    .map((segment) => segment.replace(/[-_]+/g, " "))
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (segments.length === 0) return "Root";

  return segments
    .map((segment) =>
      segment.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    )
    .join(" ");
}

function cloneValue(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function setInternalTemplate(endpoint, key, value) {
  Object.defineProperty(endpoint, key, {
    value: cloneValue(value),
    writable: true,
    configurable: true,
  });
}

function createButton(label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className
    .split(" ")
    .filter(Boolean)
    .map((name) => (name === "tab" ? "tab-button" : name))
    .join(" ");
  button.textContent = label;
  return button;
}

function setMethodBadge(element, method) {
  const normalizedMethod = String(method || "get").toLowerCase();

  element.className = "method-badge";
  element.classList.add(
    HTTP_METHODS.includes(normalizedMethod)
      ? `method-${normalizedMethod}`
      : "method-other",
  );
  element.textContent = normalizedMethod.toUpperCase();
}
