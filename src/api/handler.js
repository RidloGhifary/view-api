import { getConfig } from "../shared/config.js";
import { addRequestLog } from "../shared/requestLogs.js";
import { chance, pickRandom } from "./random.js";

const LOG_VALUE_MAX_LENGTH = 12000;

export const handleMockRequest = (req, res) => {
  const startedAt = Date.now();
  const match = findMockRoute(getConfig(), req.method, req.path);

  if (!match) {
    return sendJsonWithLog(req, res, startedAt, {
      statusCode: 404,
      body: {
        status: "failed",
        message: "Mock not found",
      },
      resultType: "not_found",
      match: null,
    });
  }

  const config = match.config;
  const isSuccess = chance(config?.behavior?.successRate ?? 100);
  const errors = config?.responses?.errors ?? [];

  if (isSuccess || !errors?.length) {
    const { statusCode = 200, body } = config?.responses?.success ?? {};
    const delay = config?.behavior?.delay ?? 0;

    if (!body) {
      return sendJsonWithLog(req, res, startedAt, {
        statusCode,
        body: "No response body defined",
        resultType: "success",
        match,
      });
    }

    const responseBody = applyParamPlaceholders(body, match.params);

    if (delay > 0) {
      return setTimeout(() => {
        sendJsonWithLog(req, res, startedAt, {
          statusCode,
          body: responseBody,
          resultType: "success",
          match,
        });
      }, delay);
    }

    return sendJsonWithLog(req, res, startedAt, {
      statusCode,
      body: responseBody,
      resultType: "success",
      match,
    });
  }

  const error = pickRandom(errors);
  const statusCode = error.statusCode ?? 500;

  if (!error.body) {
    return sendJsonWithLog(req, res, startedAt, {
      statusCode,
      body: "No error body defined",
      resultType: "error",
      match,
    });
  }

  return sendJsonWithLog(req, res, startedAt, {
    statusCode,
    body: applyParamPlaceholders(error.body, match.params),
    resultType: "error",
    match,
  });
};

export const findMockRoute = (sourceConfig, method, requestPath) => {
  const requestMethod = normalizeMethodName(method);
  const normalizedRequestPath = normalizeRoutePath(requestPath);
  const routeEntries = getRouteEntries(sourceConfig).filter(
    (entry) => entry.method === requestMethod,
  );

  const exactMatch = routeEntries.find(
    (entry) => entry.normalizedPath === normalizedRequestPath,
  );

  if (exactMatch) {
    return {
      config: exactMatch.config,
      method: exactMatch.method,
      path: exactMatch.path,
      matchType: "exact",
      params: {},
    };
  }

  for (const entry of routeEntries) {
    const params = matchParameterizedPath(
      entry.normalizedPath,
      normalizedRequestPath,
    );

    if (params) {
      return {
        config: entry.config,
        method: entry.method,
        path: entry.path,
        matchType: "params",
        params,
      };
    }
  }

  return null;
};

export const matchParameterizedPath = (routePath, requestPath) => {
  const routeSegments = splitRoutePath(routePath);
  const requestSegments = splitRoutePath(requestPath);

  if (routeSegments.length !== requestSegments.length) return null;

  const params = {};
  let hasParam = false;

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const requestSegment = requestSegments[index];

    if (routeSegment.startsWith(":") && routeSegment.length > 1) {
      hasParam = true;
      params[routeSegment.slice(1)] = decodePathSegment(requestSegment);
      continue;
    }

    if (routeSegment !== requestSegment) return null;
  }

  return hasParam ? params : null;
};

const sendJsonWithLog = (req, res, startedAt, options) => {
  const responseTimeMs = Date.now() - startedAt;

  res.status(options.statusCode).json(options.body);

  recordRequestLog(req, res, {
    ...options,
    responseTimeMs,
  });
};

const recordRequestLog = (req, res, options) => {
  try {
    addRequestLog({
      timestamp: new Date().toISOString(),
      method: normalizeMethodName(req.method),
      path: req.path || "/",
      matchedRoute: options.match?.path ?? null,
      statusCode: options.statusCode,
      statusText: res.statusMessage || getStatusText(options.statusCode),
      responseTimeMs: options.responseTimeMs,
      resultType: options.resultType,
      matchType: options.match?.matchType ?? "none",
      params: options.match?.params ?? {},
      query: toLogValue(req.query ?? {}),
      requestHeaders: req.headers,
      requestBody: hasRequestBody(req) ? toLogValue(req.body) : null,
      responseHeaders: res.getHeaders(),
      responseBody: toLogValue(options.body),
      clientIp: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    });
  } catch (error) {
    console.error("Failed to record request log:", error);
  }
};

const getStatusText = (statusCode) => {
  const statusTexts = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
  };
  return statusTexts[statusCode] || "Unknown";
};

const getRouteEntries = (sourceConfig) => {
  const entries = [];

  for (const [key, value] of Object.entries(sourceConfig || {})) {
    const parsedKey = parseFlatMockKey(key);

    if (parsedKey && value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(createRouteEntry(parsedKey.method, parsedKey.path, value));
      continue;
    }

    if (!Array.isArray(value)) continue;

    for (const route of value) {
      const [path, routeConfig] = Object.entries(route || {})[0] || [];
      if (!path || !routeConfig || typeof routeConfig !== "object") continue;

      entries.push(createRouteEntry(key, path, routeConfig));
    }
  }

  return entries;
};

const createRouteEntry = (method, path, config) => {
  const normalizedPath = normalizeRoutePath(path);

  return {
    method: normalizeMethodName(method),
    path: normalizedPath,
    normalizedPath,
    config,
  };
};

const parseFlatMockKey = (key) => {
  const match = /^([A-Za-z]+)\s+(.+)$/.exec(String(key || "").trim());
  if (!match) return null;

  return {
    method: normalizeMethodName(match[1]),
    path: match[2],
  };
};

const normalizeMethodName = (method) => String(method || "GET").trim().toUpperCase();

const normalizeRoutePath = (path) => {
  const rawPath = String(path || "/").trim().split("?")[0] || "/";
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  if (withLeadingSlash === "/") return withLeadingSlash;

  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

const splitRoutePath = (path) =>
  normalizeRoutePath(path)
    .split("/")
    .filter(Boolean);

const decodePathSegment = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const applyParamPlaceholders = (body, params) => {
  if (!params || Object.keys(params).length === 0) return body;

  return replaceParamPlaceholders(cloneValue(body), params);
};

const replaceParamPlaceholders = (value, params) => {
  if (typeof value === "string") {
    return value.replace(
      /\{\{\s*params\.([A-Za-z0-9_-]+)\s*\}\}/g,
      (placeholder, paramName) =>
        Object.prototype.hasOwnProperty.call(params, paramName)
          ? params[paramName]
          : placeholder,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceParamPlaceholders(item, params));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceParamPlaceholders(item, params),
      ]),
    );
  }

  return value;
};

const hasRequestBody = (req) => req.body !== undefined;

const toLogValue = (value) => {
  if (value === undefined) return null;

  const cloned = cloneValue(value);
  const serialized = safeStringify(cloned);

  if (serialized.length <= LOG_VALUE_MAX_LENGTH) {
    return cloned;
  }

  return {
    truncated: true,
    preview: serialized.slice(0, LOG_VALUE_MAX_LENGTH),
    size: serialized.length,
  };
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const cloneValue = (value) => {
  if (value === undefined) return undefined;

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};
