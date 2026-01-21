import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

// define routes here
import mockRoutes from "./routes/mock.routes.js";

import "dotenv/config";

export default function createApp(configPath) {
  const app = express();

  // ==== MIDDLEWARES ====
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use(cors());
  app.use(helmet());

  app.use((req, _res, next) => {
    req.mockConfigPath = configPath;
    next();
  });

  app.use(mockRoutes);

  return app;
}
