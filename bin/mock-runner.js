#!/usr/bin/env node

import { program } from "commander";
import { startApiServer } from "../src/api/server.js";
import { startEditorServer } from "../src/editor/server.js";
import { loadConfig } from "../src/shared/config.js";

program
  .name("view-api")
  .description("Run mock APIs locally from a JSON configuration file")
  .version("2.0.0");

/**
 * DEV — API + Editor
 */
program
  .command("dev [configPath]")
  .description("Start mock API with live editor UI")
  .option("--api-port <port>", "API port", 8723)
  .option("--ui-port <port>", "Editor UI port", 8724)
  .action((configPath, options) => {
    if (configPath && !configPath.endsWith(".json")) {
      console.error("➜ Config file must be a .json file");
      process.exit(1);
    }

    if (options.apiPort === options.uiPort) {
      console.error("➜ API port and UI port must be different");
      process.exit(1);
    }

    loadConfig(configPath);

    startApiServer({ port: Number(options.apiPort) });
    startEditorServer({ port: Number(options.uiPort) });
  });

program.parse();
