let requestLogs = [];
let filteredLogs = [];
let selectedLogId = null;
let apiPort = null;
let activeRequestTab = "summary";
let activeResponseTab = "summary";
let filterText = "";

const refs = {
  requestsList: document.getElementById("requests-list"),
  detailPane: document.getElementById("detail-pane"),
  filterInput: document.getElementById("filter-input"),
  clearRequests: document.getElementById("clear-requests"),
  status: document.getElementById("status"),
};

init();

async function init() {
  try {
    const portResponse = await fetch("/__api-port");
    const portData = await portResponse.json();
    apiPort = portData.port;
  } catch (error) {
    console.error("Failed to fetch API port", error);
  }

  bindEvents();
  startPolling();
  refreshLogs();
}

function bindEvents() {
  refs.filterInput.addEventListener("input", (e) => {
    filterText = e.target.value.toLowerCase();
    applyFilter();
    renderList();
  });

  refs.clearRequests.addEventListener("click", clearLogs);
}

function startPolling() {
  setInterval(refreshLogs, 2000);
}

async function refreshLogs() {
  try {
    const response = await fetch("/__logs");
    const data = await response.json();
    requestLogs = data.logs || [];
    applyFilter();
    renderList();
    renderDetail();
  } catch (error) {
    console.error("Failed to fetch logs", error);
  }
}

function applyFilter() {
  if (!filterText) {
    filteredLogs = [...requestLogs];
    return;
  }

  filteredLogs = requestLogs.filter((log) => {
    const searchString = `${log.method} ${log.path} ${log.statusCode} ${log.clientIp} ${JSON.stringify(log.requestBody || "")}`.toLowerCase();
    return searchString.includes(filterText);
  });
}

function renderList() {
  if (filteredLogs.length === 0) {
    refs.requestsList.innerHTML = `
      <div class="empty-inspector" style="height: auto; padding: 20px;">
        <p>${filterText ? "No matching requests" : "No requests captured yet"}</p>
      </div>
    `;
    return;
  }

  const html = filteredLogs
    .map((log) => {
      const isActive = log.id === selectedLogId;
      return `
      <div class="request-item ${isActive ? "active" : ""}" onclick="selectLog('${log.id}')">
        <div class="method method-${log.method.toLowerCase()}">${log.method}</div>
        <div class="path">${log.path}</div>
        <div class="meta">
          <div class="status ${getStatusClass(log.statusCode)}">${log.statusCode} ${log.statusText || ""}</div>
          <div class="duration">${log.responseTimeMs}ms</div>
        </div>
      </div>
    `;
    })
    .join("");

  refs.requestsList.innerHTML = html;
}

window.selectLog = (id) => {
  selectedLogId = id;
  renderList();
  renderDetail();
};

function renderDetail() {
  const log = requestLogs.find((l) => l.id === selectedLogId);

  if (!log) {
    refs.detailPane.innerHTML = `
      <div class="empty-inspector">
        <h3>Select a request to inspect</h3>
        <p>Every incoming mock API request will appear here.</p>
      </div>
    `;
    return;
  }

  const timeAgo = formatTimeAgo(log.timestamp);

  refs.detailPane.innerHTML = `
    <div class="detail-header">
      <div class="detail-meta">
        <span>${timeAgo}</span>
        <span>${log.responseTimeMs}ms</span>
        <span>IP: ${log.clientIp}</span>
      </div>
      <div class="detail-title-row">
        <div class="detail-title">
          <span class="method method-${log.method.toLowerCase()}">${log.method}</span>
          <span>${log.path}</span>
        </div>
        <button class="primary-button" onclick="replayRequest('${log.id}')">Replay</button>
      </div>
    </div>

    <div class="detail-scroll">
      <div class="section-tabs">
        <div class="section-tab ${activeRequestTab === "summary" ? "active" : ""}" onclick="setTab('request', 'summary')">Summary</div>
        <div class="section-tab ${activeRequestTab === "headers" ? "active" : ""}" onclick="setTab('request', 'headers')">Headers</div>
        <div class="section-tab ${activeRequestTab === "raw" ? "active" : ""}" onclick="setTab('request', 'raw')">Raw</div>
        <div class="section-tab ${activeRequestTab === "binary" ? "active" : ""}" onclick="setTab('request', 'binary')">Binary</div>
      </div>

      <div class="tab-content ${activeRequestTab === "summary" ? "active" : ""}">
        <div class="data-grid">
          <div class="data-label">Method</div><div class="data-value">${log.method}</div>
          <div class="data-label">Path</div><div class="data-value">${log.path}</div>
          <div class="data-label">Query</div><div class="data-value">${JSON.stringify(log.query)}</div>
          <div class="data-label">Params</div><div class="data-value">${JSON.stringify(log.params)}</div>
        </div>
      </div>
      <div class="tab-content ${activeRequestTab === "headers" ? "active" : ""}">
        <div class="data-grid">
          ${renderHeaders(log.requestHeaders)}
        </div>
      </div>
      <div class="tab-content ${activeRequestTab === "raw" ? "active" : ""}">
        <pre class="code-block">${JSON.stringify(log.requestBody, null, 2) || "(empty)"}</pre>
      </div>
      <div class="tab-content ${activeRequestTab === "binary" ? "active" : ""}">
        <p class="muted">Binary preview is not available yet</p>
      </div>

      <div class="response-section">
        <div class="response-header">
          <div class="response-status ${getStatusClass(log.statusCode)}">${log.statusCode} ${log.statusText || ""}</div>
        </div>

        <div class="section-tabs">
          <div class="section-tab ${activeResponseTab === "summary" ? "active" : ""}" onclick="setTab('response', 'summary')">Summary</div>
          <div class="section-tab ${activeResponseTab === "headers" ? "active" : ""}" onclick="setTab('response', 'headers')">Headers</div>
          <div class="section-tab ${activeResponseTab === "raw" ? "active" : ""}" onclick="setTab('response', 'raw')">Raw</div>
          <div class="section-tab ${activeResponseTab === "binary" ? "active" : ""}" onclick="setTab('response', 'binary')">Binary</div>
        </div>

        <div class="tab-content ${activeResponseTab === "summary" ? "active" : ""}">
           <pre class="code-block">${typeof log.responseBody === "object" ? JSON.stringify(log.responseBody, null, 2) : log.responseBody}</pre>
        </div>
        <div class="tab-content ${activeResponseTab === "headers" ? "active" : ""}">
          <div class="data-grid">
            ${renderHeaders(log.responseHeaders)}
          </div>
        </div>
        <div class="tab-content ${activeResponseTab === "raw" ? "active" : ""}">
          <pre class="code-block">${typeof log.responseBody === "object" ? JSON.stringify(log.responseBody, null, 2) : log.responseBody}</pre>
        </div>
        <div class="tab-content ${activeResponseTab === "binary" ? "active" : ""}">
          <p class="muted">Binary preview is not available yet</p>
        </div>
      </div>
    </div>
  `;
}

window.setTab = (type, tab) => {
  if (type === "request") activeRequestTab = tab;
  else activeResponseTab = tab;
  renderDetail();
};

function renderHeaders(headers) {
  if (!headers) return "No headers";
  return Object.entries(headers)
    .map(([key, value]) => `
      <div class="data-label">${key}</div>
      <div class="data-value">${value}</div>
    `)
    .join("");
}

async function clearLogs() {
  if (!confirm("Clear all request logs?")) return;
  try {
    await fetch("/__logs", { method: "DELETE" });
    requestLogs = [];
    selectedLogId = null;
    applyFilter();
    renderList();
    renderDetail();
    showStatus("Logs cleared");
  } catch (error) {
    showStatus("Failed to clear logs", true);
  }
}

window.replayRequest = async (id) => {
  const log = requestLogs.find((l) => l.id === id);
  if (!log || !apiPort) return;

  showStatus("Replaying request...");

  try {
    const url = `http://${window.location.hostname}:${apiPort}${log.path}${renderQuery(log.query)}`;
    const response = await fetch(url, {
      method: log.method,
      headers: log.requestHeaders,
      body: ["GET", "HEAD"].includes(log.method.toUpperCase()) ? null : JSON.stringify(log.requestBody),
    });

    showStatus(`Replay finished: ${response.status} ${response.statusText}`);
    refreshLogs();
  } catch (error) {
    showStatus(`Replay failed: ${error.message}`, true);
  }
};

function renderQuery(query) {
  if (!query || Object.keys(query).length === 0) return "";
  const params = new URLSearchParams(query);
  return `?${params.toString()}`;
}

function getStatusClass(statusCode) {
  if (statusCode >= 200 && statusCode < 300) return "status-2xx";
  if (statusCode >= 400 && statusCode < 500) return "status-4xx";
  if (statusCode >= 500) return "status-5xx";
  return "status-other";
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 20) return "less than 20 seconds ago";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}

function showStatus(message, isError = false) {
  refs.status.textContent = message;
  refs.status.className = `status-toast ${isError ? "error" : "ok"} visible`;
  setTimeout(() => {
    refs.status.classList.remove("visible");
  }, 3000);
}
