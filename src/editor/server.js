import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig, setConfig } from "../shared/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startEditorServer = ({ port }) => {
  const app = express();
  app.use(express.json());

  // serve UI
  app.use(express.static(path.join(__dirname, "public")));

  // get current config
  app.get("/__config", (_req, res) => {
    res.json(getConfig());
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
