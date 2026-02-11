import { Router, Request, Response } from "express";
import { semanticSearch } from "../services/ingestion";

const router = Router();

// POST /api/search - Semantic search across stories and comments
router.post("/", async (req: Request, res: Response) => {
  try {
    const { query, type = "stories", limit = 10 } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await semanticSearch(
      query.trim(),
      type as "stories" | "comments",
      Math.min(limit, 50)
    );

    res.json({ results, query: query.trim(), type });
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
