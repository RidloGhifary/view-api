import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { handleMockRequest } from "./handler.js";

export const startApiServer = ({ port }) => {
  const app = express();

  app.use(express.json());
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));

  app.use(handleMockRequest);

  app.listen(port, () =>
    console.log(`➜ API running at   http://localhost:${port}`),
  );
};
