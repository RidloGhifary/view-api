import fs from "fs";

export const loadConfig = (configPath) => {
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
};
