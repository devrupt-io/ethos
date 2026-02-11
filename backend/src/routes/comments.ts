import { Router, Request, Response } from "express";
import { Comment, Story } from "../models";

const router = Router();

// GET /api/comments - List analyzed comments
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const storyHnId = req.query.storyHnId ? parseInt(req.query.storyHnId as string) : undefined;

    const where: any = { embedded: true };
    if (storyHnId) where.storyHnId = storyHnId;

    const { count, rows } = await Comment.findAndCountAll({
      where,
      order: [["time", "DESC"]],
      limit,
      offset,
    });

    // Enrich with story titles
    const storyIds = [...new Set(rows.map((c) => c.storyHnId))];
    const stories = await Story.findAll({
      where: { hnId: storyIds },
      attributes: ["hnId", "title"],
    });
    const storyTitleMap = new Map(stories.map((s) => [s.hnId, s.title]));

    const enriched = rows.map((c) => ({
      ...c.toJSON(),
      storyTitle: storyTitleMap.get(c.storyHnId) || null,
    }));

    res.json({
      comments: enriched,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

export default router;
