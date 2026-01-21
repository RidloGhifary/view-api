import { handle } from "../services/mock.service.js";

export const handleRequest = async (req, res, next) => {
  try {
    // call service to handle request
    const data = handle(req.mockConfigPath, req.method, req.path);
    console.log("🚀 ~ handleRequest ~ data:", data);

    if (!data) {
      return res.status(404).json({
        status: "failed",
        message: `No mock defined for ${req.method} ${req.path}`,
      });
    }

    // return response
    return res.status(data.statusCode).json(data.body);
  } catch (err) {
    next(err);
  }
};
