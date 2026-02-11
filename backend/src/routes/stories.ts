import { Router, Request, Response } from "express";
import { Story } from "../models";
import { Op } from "sequelize";
import sequelize from "../database";

const router = Router();

// GET /api/stories - List analyzed stories
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await Story.findAndCountAll({
      where: { embedded: true },
      order: [["time", "DESC"]],
      limit,
      offset,
    });

    res.json({
      stories: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

// GET /api/stories/:hnId
router.get("/:hnId", async (req: Request, res: Response) => {
  try {
    const hnId = parseInt(req.params.hnId);
    const story = await Story.findOne({ where: { hnId } });
    if (!story) return res.status(404).json({ error: "Story not found" });
    res.json(story);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

export default router;
