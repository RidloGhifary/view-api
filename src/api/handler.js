import { getConfig } from "../shared/config.js";
import { chance, pickRandom } from "./random.js";

export const handleMockRequest = (req, res) => {
  const key = `${req.method.toUpperCase()} ${req.path}`;
  const config = getConfig()[key];

  if (!config) {
    return res.status(404).json({
      status: "failed",
      message: "Mock not found",
    });
  }

  const isSuccess = chance(config?.behavior?.successRate ?? 100);
  const errors = config?.responses?.errors ?? [];

  if (isSuccess || !errors?.length) {
    const { statusCode = 200, body } = config.responses.success;
    const delay = config?.behavior?.delay ?? 0;

    if (!body) {
      return res.status(statusCode).json("No response body defined");
    }

    if (delay > 0) {
      return setTimeout(() => {
        res.status(statusCode).json(body);
      }, delay);
    }

    return res.status(statusCode).json(body);
  }

  const error = pickRandom(errors);

  if (!error.body) {
    return res.status(error.statusCode ?? 500).json("No error body defined");
  }

  return res.status(error.statusCode ?? 500).json(error.body);
};
