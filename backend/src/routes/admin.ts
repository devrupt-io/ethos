import { Router, Request, Response, NextFunction } from "express";
import { Story, Comment } from "../models";
import { Op } from "sequelize";
import { ANALYSIS_VERSION } from "../services/openrouter";
import * as chroma from "../services/chroma";
import sequelize from "../database";
import { workerState, queueRegeneration, isRegenerationRunning } from "../services/ingestion";

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ethos";
const ADMIN_PASS = process.env.ADMIN_PASS || "ethos";

// Simple session tokens (in-memory, good enough for single-instance dev/prod)
const activeSessions = new Map<string, { email: string; expiresAt: number }>();

function generateToken(): string {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    activeSessions.delete(token || "");
    res.status(401).json({ error: "Session expired" });
    return;
  }
  next();
}

// POST /api/admin/login
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    const token = generateToken();
    activeSessions.set(token, { email, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// All routes below require auth
router.use(requireAuth);

// GET /api/admin/status - Combined health + worker + analysis status
router.get("/status", async (_req: Request, res: Response) => {
  try {
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

    const storyCount = await Story.count();
    const commentCount = await Comment.count();
    const embeddedStories = await Story.count({ where: { embedded: true } });
    const embeddedComments = await Comment.count({ where: { embedded: true } });

    // Version breakdown
    const allStories = await Story.findAll({
      where: { embedded: true },
      attributes: ["analysisVersion", "processedAt"],
    });
    const allComments = await Comment.findAll({
      where: { embedded: true },
      attributes: ["analysisVersion", "processedAt"],
    });

    const storyVersions: Record<string, number> = {};
    const commentVersions: Record<string, number> = {};
    let oldestProcessed: Date | null = null;
    let newestProcessed: Date | null = null;

    for (const s of allStories) {
      const v = s.analysisVersion || "1";
      storyVersions[v] = (storyVersions[v] || 0) + 1;
      if (s.processedAt) {
        if (!oldestProcessed || s.processedAt < oldestProcessed) oldestProcessed = s.processedAt;
        if (!newestProcessed || s.processedAt > newestProcessed) newestProcessed = s.processedAt;
      }
    }
    for (const c of allComments) {
      const v = c.analysisVersion || "1";
      commentVersions[v] = (commentVersions[v] || 0) + 1;
    }

    const storiesNeedingUpdate = allStories.filter((s) => (s.analysisVersion || "1") !== ANALYSIS_VERSION).length;
    const commentsNeedingUpdate = allComments.filter((c) => (c.analysisVersion || "1") !== ANALYSIS_VERSION).length;

    res.json({
      health: {
        database: checks.database,
        chromadb: checks.chromadb,
        healthy: checks.database && checks.chromadb && workerState.running,
      },
      data: {
        storyCount,
        commentCount,
        embeddedStories,
        embeddedComments,
        pendingStories: storyCount - embeddedStories,
        pendingComments: commentCount - embeddedComments,
      },
      worker: {
        running: workerState.running,
        lastRunAt: workerState.lastRunAt,
        lastRunResult: workerState.lastRunResult,
        currentlyProcessing: workerState.currentlyProcessing,
        totalProcessed: workerState.totalProcessed,
        totalEmbedded: workerState.totalEmbedded,
        recentErrors: workerState.errors.slice(-10),
        avgTimePerStory: workerState.totalProcessed > 0 && workerState.cycleStartedAt
          ? Math.round((Date.now() - workerState.cycleStartedAt) / workerState.totalProcessed / 1000)
          : null,
        cycleStartedAt: workerState.cycleStartedAt ? new Date(workerState.cycleStartedAt).toISOString() : null,
      },
      analysis: {
        currentVersion: ANALYSIS_VERSION,
        storyVersions,
        commentVersions,
        storiesNeedingUpdate,
        commentsNeedingUpdate,
        oldestProcessed,
        newestProcessed,
      },
    });
  } catch (error) {
    console.error("Error fetching admin status:", error);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// GET /api/admin/analysis-status (kept for backward compat)
router.get("/analysis-status", async (_req: Request, res: Response) => {
  try {
    const stories = await Story.findAll({
      where: { embedded: true },
      attributes: ["analysisVersion", "processedAt"],
    });

    const comments = await Comment.findAll({
      where: { embedded: true },
      attributes: ["analysisVersion", "processedAt"],
    });

    const storyVersions: Record<string, number> = {};
    const commentVersions: Record<string, number> = {};
    let oldestStoryDate: Date | null = null;
    let newestStoryDate: Date | null = null;

    for (const s of stories) {
      const v = s.analysisVersion || "1";
      storyVersions[v] = (storyVersions[v] || 0) + 1;
      if (s.processedAt) {
        if (!oldestStoryDate || s.processedAt < oldestStoryDate) oldestStoryDate = s.processedAt;
        if (!newestStoryDate || s.processedAt > newestStoryDate) newestStoryDate = s.processedAt;
      }
    }

    for (const c of comments) {
      const v = c.analysisVersion || "1";
      commentVersions[v] = (commentVersions[v] || 0) + 1;
    }

    const storiesNeedingUpdate = stories.filter((s) => (s.analysisVersion || "1") !== ANALYSIS_VERSION).length;
    const commentsNeedingUpdate = comments.filter((c) => (c.analysisVersion || "1") !== ANALYSIS_VERSION).length;

    res.json({
      currentVersion: ANALYSIS_VERSION,
      stories: {
        total: stories.length,
        byVersion: storyVersions,
        needingUpdate: storiesNeedingUpdate,
        oldestProcessed: oldestStoryDate,
        newestProcessed: newestStoryDate,
      },
      comments: {
        total: comments.length,
        byVersion: commentVersions,
        needingUpdate: commentsNeedingUpdate,
      },
    });
  } catch (error) {
    console.error("Error fetching analysis status:", error);
    res.status(500).json({ error: "Failed to fetch analysis status" });
  }
});

// POST /api/admin/regenerate - Queue background regeneration
router.post("/regenerate", async (req: Request, res: Response) => {
  try {
    const { targetVersion, maxItems, type, since, until } = req.body || {};

    const result = await queueRegeneration({
      targetVersion,
      maxItems: maxItems || 50,
      type: type || "all",
      since,
      until,
    });

    if (result.queued) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(409).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Error queuing regeneration:", error);
    res.status(500).json({ error: "Failed to queue regeneration" });
  }
});

// GET /api/admin/regeneration-status
router.get("/regeneration-status", (_req: Request, res: Response) => {
  res.json({ running: isRegenerationRunning() });
});

export default router;
