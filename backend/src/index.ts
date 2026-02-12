import express from "express";
import cors from "cors";
import sequelize from "./database";
import storiesRouter from "./routes/stories";
import commentsRouter from "./routes/comments";
import searchRouter from "./routes/search";
import insightsRouter from "./routes/insights";
import adminRouter from "./routes/admin";
import healthRouter from "./routes/health";
import { startBackgroundWorker } from "./services/ingestion";

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || "23101");

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }
      : {}
  )
);
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/stories", storiesRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/search", searchRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/admin", adminRouter);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("[boot] Database connection established.");

    await sequelize.sync({ alter: true });
    console.log("[boot] Database models synchronized.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[boot] Backend listening on port ${PORT}`);

      // Start background ingestion worker after server is up
      startBackgroundWorker();
    });
  } catch (error) {
    console.error("[boot] Failed to start server:", error);
    process.exit(1);
  }
}

start();

export default app;
