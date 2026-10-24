import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { BACKEND_ROOT } from "./config/loadEnv.js";
import authRoutes from "./routes/auth.js";
import contentRoutes from "./routes/content.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(BACKEND_ROOT, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api", contentRoutes);
app.use("/api", notFound);
app.use(errorHandler);

export default app;
