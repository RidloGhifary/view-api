import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig, setConfig } from "../shared/config.js";
import { clearRequestLogs, getRequestLogs } from "../shared/requestLogs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startEditorServer = ({ port, apiPort }) => {
  const app = express();
  app.use(express.json());

  // serve UI
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/requests", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "requests.html"));
  });

  app.get("/__api-port", (_req, res) => {
    res.json({ port: apiPort });
  });

  // get current config
  app.get("/__config", (_req, res) => {
    res.json(getConfig());
  });

  app.get("/__logs", (_req, res) => {
    res.json({ logs: getRequestLogs() });
  });

  app.delete("/__logs", (_req, res) => {
    clearRequestLogs();
    res.json({ ok: true });
  });

  // save config
  app.post("/__config", (req, res) => {
    setConfig(req.body);
    res.json({ ok: true });
  });

  app.listen(port, () =>
    console.log(`➜ EDITOR running at   http://localhost:${port}`),
  );
};
