import { json } from "https://esm.sh/@codemirror/lang-json";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";

let editor, saveTimer, statusTimer;
let lastValid = true;

const statusEl =
  document.getElementById("status") || document.createElement("div");
statusEl.id = "status";
document.body.appendChild(statusEl);

// load config
const res = await fetch("/__config");
const data = await res.json();

const customTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    fontFamily: `"JetBrains Mono", "Fira Code", monospace`,
  },
  ".cm-content": {
    padding: "16px",
  },
});

editor = new EditorView({
  doc: JSON.stringify(data, null, 2),
  extensions: [
    basicSetup,
    json(),
    oneDark,
    customTheme,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      debounceSave();
    }),
  ],
  parent: document.getElementById("editor"),
});

function debounceSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveConfig, 700);
}

async function saveConfig() {
  try {
    const value = editor.state.doc.toString();
    if (!value.trim().endsWith("}")) return;

    const parsed = JSON.parse(value);

    await fetch("/__config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    showStatus("Saved ✓", false);
    lastValid = true;
  } catch (err) {
    showStatus("Invalid JSON ✗", true);
    lastValid = false;
  }
}

function showStatus(text, isError) {
  clearTimeout(statusTimer);

  statusEl.textContent = text;
  statusEl.className = isError ? "error" : "ok";
  statusEl.style.opacity = "1";

  statusTimer = setTimeout(() => {
    statusEl.style.opacity = "0";
  }, 2500);
}
