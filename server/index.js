import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import meRoutes from "./routes/me.js";
import notificationRoutes from "./routes/notifications.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8081;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Team Task Manager" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/me", meRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", taskRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

const clientDist = path.join(__dirname, "..", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, message: err.errors[0]?.message || "Invalid input", errors: err.errors });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Invalid or expired session", errors: [] });
  }

  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Something went wrong", errors: [] });
});

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
