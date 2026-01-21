import { loadConfig } from "../utils/loadConfig.js";
import { pickResponse } from "../utils/responsePicker.js";

export const handle = (mockConfigPath, method, path) => {
  const config = loadConfig(mockConfigPath);
  const key = `${method} ${path}`;

  const route = config.routes[key];

  if (!route) {
    return null;
  }

  return pickResponse(route);
};
