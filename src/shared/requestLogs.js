const MAX_LOGS = 100;

let logs = [];
let nextLogId = 1;

export const addRequestLog = (entry) => {
  const log = {
    id: `req_${nextLogId++}`,
    timestamp: new Date().toISOString(),
    ...cloneValue(entry),
  };

  logs.unshift(log);

  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }

  return cloneValue(log);
};

export const getRequestLogs = () => cloneValue(logs);

export const clearRequestLogs = () => {
  logs = [];
};

const cloneValue = (value) => {
  if (value === undefined) return undefined;

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};
