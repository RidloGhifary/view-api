#!/usr/bin/env node

import path from "path";
import { program } from "commander";
import startServer from "../src/server.js";

program
  .name("mock-runner")
  .description("Run mock APIs from a JSON config")
  .version("1.0.0");

program
  .command("start <config>")
  .option("-p, --port <port>", "port to run server", "3000")
  .action((config, options) => {
    const configPath = path.resolve(process.cwd(), config);
    startServer({ configPath, port: Number(options.port) || 8734 });
  });

program.parse();
