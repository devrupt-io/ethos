import { Router, Request, Response } from "express";
import sequelize from "../database";
import * as chroma from "../services/chroma";
import { Story, Comment } from "../models";
import { workerState } from "../services/ingestion";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {};

  try {
    await sequelize.authenticate();
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    checks.chromadb = await chroma.testConnection();
  } catch {
    checks.chromadb = false;
  }

  try {
    const embeddedStories = await Story.count({ where: { embedded: true } });
    const embeddedComments = await Comment.count({ where: { embedded: true } });
    checks.data = { embeddedStories, embeddedComments };
  } catch {
    checks.data = null;
  }

  const healthy = checks.database === true && checks.chromadb === true && workerState.running;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    checks,
  });
});

export default router;
