import { json } from "https://esm.sh/@codemirror/lang-json";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";

const res = await fetch("/__config");
const data = await res.json();

let config = data; // from /__config
let endpoints = parseConfig(config);
let activeIndex = 0;
let activeErrorIndex = 0;

function parseConfig(config) {
  const result = [];

  for (const method in config || {}) {
    for (const routeObj of config[method] || []) {
      const path = Object.keys(routeObj)[0];
      const value = routeObj[path];

      result.push({
        method,
        path,
        ...value,
      });
    }
  }

  return result;
}

function buildConfig(endpoints) {
  const newConfig = {};

  endpoints.forEach((e) => {
    if (!newConfig[e.method]) newConfig[e.method] = [];

    newConfig[e.method].push({
      [e.path]: {
        successRate: e.successRate ?? 100,
        delay: e.delay ?? 0,
        success: e.success ?? {},
        errors: e.errors ?? [],
      },
    });
  });

  return newConfig;
}

function renderSidebar() {
  const container = document.getElementById("endpoint-list");
  container.innerHTML = "";

  endpoints.forEach((e, index) => {
    const item = document.createElement("div");
    item.className = "endpoint-item" + (index === activeIndex ? " active" : "");

    item.innerHTML = `
      <div>
        <span class="endpoint-method">${e.method.toUpperCase()}</span>
        <span class="endpoint-path">${e.path}</span>
      </div>
      <div class="endpoint-actions">
        <button data-action="edit">✏️</button>
        <button data-action="delete">🗑</button>
      </div>
    `;

    // select endpoint
    item.addEventListener("click", () => {
      activeIndex = index;
      renderSidebar();
      renderMain(); // later
    });

    // actions
    item.querySelector('[data-action="edit"]').onclick = (ev) => {
      ev.stopPropagation();
      editEndpoint(index);
    };

    item.querySelector('[data-action="delete"]').onclick = (ev) => {
      ev.stopPropagation();
      deleteEndpoint(index);
    };

    container.appendChild(item);
  });
}

function editEndpoint(index) {
  const newPath = prompt("Edit endpoint path:", endpoints[index].path);
  if (!newPath) return;

  endpoints[index].path = newPath;

  syncConfig();
}

document.getElementById("add-endpoint").onclick = () => {
  endpoints.push({
    method: "get",
    path: "/new-endpoint",
    successRate: 100,
    delay: 0,
    success: {
      status: "success",
      data: {},
    },
    errors: [],
  });

  activeIndex = endpoints.length - 1;

  syncConfig();
};

function deleteEndpoint(index) {
  if (!confirm("Delete this endpoint?")) return;

  endpoints.splice(index, 1);

  activeIndex = Math.max(0, activeIndex - 1);

  syncConfig();
}

async function syncConfig() {
  config = buildConfig(endpoints);

  await fetch("/__config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  renderSidebar();
}

let activeTab = "success";
let jsonEditor; // CodeMirror instance for main panel

function renderMain() {
  const endpoint = endpoints[activeIndex];
  const editorContainer = document.getElementById("editor-container");
  const methodSelect = document.getElementById("method-select");
  const pathText = document.getElementById("endpoint-path-text");

  if (!endpoint) {
    methodSelect.value = "get";
    pathText.textContent = "No endpoint selected";
    document.getElementById("success-rate-value").textContent = "0";
    document.getElementById("success-rate").value = 0;
    document.getElementById("delay-input").value = 0;
    document.getElementById("tabs").innerHTML =
      '<button data-tab="success" class="active">Success</button>';
    editorContainer.innerHTML =
      "<p>No endpoints yet. Add one to start editing.</p>";
    return;
  }

  // set path
  pathText.textContent = endpoint.path;

  // set method dropdown
  methodSelect.value = endpoint.method;

  methodSelect.onchange = () => {
    endpoint.method = methodSelect.value;

    syncConfig(); // update backend
    renderSidebar(); // update sidebar label
  };

  // controls
  const successRateInput = document.getElementById("success-rate");
  const successRateValue = document.getElementById("success-rate-value");
  const delayInput = document.getElementById("delay-input");

  successRateInput.value = endpoint.successRate ?? 100;
  successRateValue.textContent = successRateInput.value;
  delayInput.value = endpoint.delay ?? 0;

  successRateInput.oninput = () => {
    endpoint.successRate = Number(successRateInput.value);
    successRateValue.textContent = successRateInput.value;
    syncConfig();
  };

  delayInput.oninput = () => {
    endpoint.delay = Number(delayInput.value);
    syncConfig();
  };

  // tabs
  document.querySelectorAll("#tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeTab);
    btn.onclick = () => {
      activeTab = btn.dataset.tab;
      renderMain();
    };
  });

  // editor content
  editorContainer.innerHTML = "";

  let content;

  if (activeTab === "success") {
    content = endpoint.success;
  } else {
    endpoint.errors = endpoint.errors || [];
    activeErrorIndex = Math.max(
      0,
      Math.min(activeErrorIndex, endpoint.errors.length - 1),
    );
    content = endpoint.errors[activeErrorIndex] || {
      status: "failed",
      message: "Error message",
      error_code: "ERROR",
    };
  }

  jsonEditor = new EditorView({
    doc: JSON.stringify(content, null, 2),
    parent: editorContainer,
    extensions: [
      basicSetup,
      json(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        debounceMainEditorSave();
      }),
    ],
  });

  renderTabs(endpoint);
}

let mainSaveTimer;

function debounceMainEditorSave() {
  clearTimeout(mainSaveTimer);
  mainSaveTimer = setTimeout(saveMainEditor, 600);
}

function saveMainEditor() {
  try {
    const value = jsonEditor.state.doc.toString();
    const parsed = JSON.parse(value);

    const endpoint = endpoints[activeIndex];

    if (activeTab === "success") {
      endpoint.success = parsed;
    } else {
      endpoint.errors[activeErrorIndex] = parsed;
    }

    syncConfig();
  } catch (err) {
    console.error("❌ MAIN EDITOR ERROR:", err);
  }
}

function renderTabs(endpoint) {
  const tabsContainer = document.getElementById("tabs");
  tabsContainer.innerHTML = "";

  // ✅ Success tab
  const successTab = document.createElement("button");
  successTab.textContent = "Success";
  successTab.className = activeTab === "success" ? "active" : "";
  successTab.onclick = () => {
    activeTab = "success";
    renderMain();
  };
  tabsContainer.appendChild(successTab);

  // ❌ Error tabs
  endpoint.errors = endpoint.errors || [];

  endpoint.errors.forEach((_, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";

    const btn = document.createElement("button");
    btn.textContent = `Error ${index + 1}`;
    btn.className =
      activeTab === "error" && activeErrorIndex === index ? "active" : "";

    btn.onclick = () => {
      activeTab = "error";
      activeErrorIndex = index;
      renderMain();
    };

    const del = document.createElement("span");
    del.textContent = "×";
    del.style.marginLeft = "6px";
    del.style.cursor = "pointer";

    del.onclick = (e) => {
      e.stopPropagation();

      endpoint.errors.splice(index, 1);

      if (activeErrorIndex >= endpoint.errors.length) {
        activeErrorIndex = endpoint.errors.length - 1;
      }

      if (endpoint.errors.length === 0) {
        activeTab = "success";
      }

      syncConfig();
      renderMain();
    };

    wrapper.appendChild(btn);
    wrapper.appendChild(del);
    tabsContainer.appendChild(wrapper);
  });

  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.onclick = () => {
    endpoint.errors.push({
      status: "failed",
      message: "New error",
      error_code: "ERROR_CODE",
    });

    activeTab = "error";
    activeErrorIndex = endpoint.errors.length - 1;

    syncConfig();
    renderMain();
  };

  tabsContainer.appendChild(addBtn);
}

renderSidebar();
renderMain();
