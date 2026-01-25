import fs from "fs";
import { defaultMockConfig } from "./defaultConfig.js";

let config = {};

export const loadConfig = (path) => {
  if (!path) {
    config = structuredClone(defaultMockConfig);
    return;
  }

  if (!fs.existsSync(path)) {
    throw new Error(`Mock config file not found: ${path}`);
  }

  config = JSON.parse(fs.readFileSync(path, "utf-8"));
};

export const getConfig = () => config;

export const setConfig = (next) => {
  config = next;
};
