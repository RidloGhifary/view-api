import express from "express";
import { handleRequest } from "../controllers/mock.controller.js";

const router = express.Router();

router.use(handleRequest);

export default router;
