import { Router, Request, Response } from "express";
import { Story, Comment } from "../models";
import { Op } from "sequelize";
import sequelize from "../database";

const router = Router();

// GET /api/insights/concepts - Trending concepts across stories and comments
router.get("/concepts", async (_req: Request, res: Response) => {
  try {
    const stories = await Story.findAll({
      where: { concepts: { [Op.ne]: null }, embedded: true },
      attributes: ["concepts", "technologies", "sentiment", "sentimentScore", "time", "title", "hnId", "coreIdea"],
      order: [["time", "DESC"]],
      limit: 200,
    });

    const comments = await Comment.findAll({
      where: { concepts: { [Op.ne]: null }, embedded: true },
      attributes: ["concepts", "sentiment", "sentimentScore", "commentType", "time", "argumentSummary", "by", "technologies", "hnId", "storyHnId"],
      order: [["time", "DESC"]],
      limit: 500,
    });

    // Aggregate concepts with rich metadata
    const conceptMap: Record<string, {
      count: number;
      storyCount: number;
      commentCount: number;
      sentimentSum: number;
      sentimentCount: number;
      recentStories: { title: string; hnId: number; coreIdea: string | null }[];
      recentComments: { argumentSummary: string | null; by: string | null; commentType: string | null; hnId: number; storyHnId: number }[];
      commentTypes: Record<string, number>;
      technologies: Record<string, number>;
    }> = {};

    for (const story of stories) {
      if (!story.concepts) continue;
      for (const concept of story.concepts) {
        const key = concept.toLowerCase();
        if (!conceptMap[key]) {
          conceptMap[key] = { count: 0, storyCount: 0, commentCount: 0, sentimentSum: 0, sentimentCount: 0, recentStories: [], recentComments: [], commentTypes: {}, technologies: {} };
        }
        conceptMap[key].count++;
        conceptMap[key].storyCount++;
        if (story.sentimentScore != null) {
          conceptMap[key].sentimentSum += story.sentimentScore;
          conceptMap[key].sentimentCount++;
        }
        if (conceptMap[key].recentStories.length < 3) {
          conceptMap[key].recentStories.push({ title: story.title, hnId: story.hnId, coreIdea: story.coreIdea });
        }
      }
    }

    for (const comment of comments) {
      if (!comment.concepts) continue;
      for (const concept of comment.concepts) {
        const key = concept.toLowerCase();
        if (!conceptMap[key]) {
          conceptMap[key] = { count: 0, storyCount: 0, commentCount: 0, sentimentSum: 0, sentimentCount: 0, recentStories: [], recentComments: [], commentTypes: {}, technologies: {} };
        }
        conceptMap[key].count++;
        conceptMap[key].commentCount++;
        if (comment.sentimentScore != null) {
          conceptMap[key].sentimentSum += comment.sentimentScore;
          conceptMap[key].sentimentCount++;
        }
        if (comment.commentType) {
          conceptMap[key].commentTypes[comment.commentType] = (conceptMap[key].commentTypes[comment.commentType] || 0) + 1;
        }
        if (conceptMap[key].recentComments.length < 3) {
          conceptMap[key].recentComments.push({
            argumentSummary: comment.argumentSummary,
            by: comment.by,
            commentType: comment.commentType,
            hnId: comment.hnId,
            storyHnId: comment.storyHnId,
          });
        }
        // Collect technologies from comments
        if (comment.technologies) {
          for (const t of comment.technologies) {
            conceptMap[key].technologies[t] = (conceptMap[key].technologies[t] || 0) + 1;
          }
        }
      }
    }

    // Also collect technologies from stories
    for (const story of stories) {
      if (!story.concepts || !story.technologies) continue;
      for (const concept of story.concepts) {
        const key = concept.toLowerCase();
        if (!conceptMap[key]) continue;
        for (const t of story.technologies) {
          conceptMap[key].technologies[t] = (conceptMap[key].technologies[t] || 0) + 1;
        }
      }
    }

    const concepts = Object.entries(conceptMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        storyCount: data.storyCount,
        commentCount: data.commentCount,
        avgSentiment: data.sentimentCount > 0 ? data.sentimentSum / data.sentimentCount : 0,
        recentStories: data.recentStories,
        recentComments: data.recentComments,
        topCommentTypes: Object.entries(data.commentTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => ({ type, count })),
        technologies: Object.entries(data.technologies)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    res.json({ concepts });
  } catch (error) {
    console.error("Error fetching concepts:", error);
    res.status(500).json({ error: "Failed to fetch concepts" });
  }
});

// GET /api/insights/sentiment - Sentiment distribution across stories
router.get("/sentiment", async (req: Request, res: Response) => {
  try {
    // Support time range filtering: ?range=24h|7d|30d|all (default: 24h)
    const range = (req.query.range as string) || "24h";
    const now = Math.floor(Date.now() / 1000);
    let sinceTime = 0;
    switch (range) {
      case "24h": sinceTime = now - 24 * 3600; break;
      case "7d": sinceTime = now - 7 * 24 * 3600; break;
      case "30d": sinceTime = now - 30 * 24 * 3600; break;
      case "all": sinceTime = 0; break;
      default: sinceTime = now - 24 * 3600;
    }

    const timeFilter = sinceTime > 0 ? { time: { [Op.gte]: sinceTime } } : {};

    const stories = await Story.findAll({
      where: { embedded: true, sentiment: { [Op.ne]: null }, ...timeFilter },
      attributes: ["sentiment", "sentimentScore", "controversyPotential", "intellectualDepth", "coreIdea", "title", "hnId", "time", "score"],
      order: [["time", "DESC"]],
    });

    const distribution: Record<string, number> = {};
    const controversyDist: Record<string, number> = {};
    const depthDist: Record<string, number> = {};

    for (const s of stories) {
      if (s.sentiment) distribution[s.sentiment] = (distribution[s.sentiment] || 0) + 1;
      if (s.controversyPotential) controversyDist[s.controversyPotential] = (controversyDist[s.controversyPotential] || 0) + 1;
      if (s.intellectualDepth) depthDist[s.intellectualDepth] = (depthDist[s.intellectualDepth] || 0) + 1;
    }

    const controversial = stories
      .filter((s) => s.controversyPotential === "high" && (s.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map((s) => ({ title: s.title, hnId: s.hnId, coreIdea: s.coreIdea, sentiment: s.sentiment, score: s.score }));

    const deepDives = stories
      .filter((s) => s.intellectualDepth === "deep" && (s.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map((s) => ({ title: s.title, hnId: s.hnId, coreIdea: s.coreIdea, sentiment: s.sentiment, score: s.score }));

    res.json({
      sentimentDistribution: distribution,
      controversyDistribution: controversyDist,
      depthDistribution: depthDist,
      controversial,
      deepDives,
      totalAnalyzed: stories.length,
      range,
    });
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    res.status(500).json({ error: "Failed to fetch sentiment data" });
  }
});

// GET /api/insights/concepts/:name - Stories and comments for a specific concept
router.get("/concepts/:name", async (req: Request, res: Response) => {
  try {
    const conceptName = decodeURIComponent(req.params.name).toLowerCase();

    const stories = await Story.findAll({
      where: { concepts: { [Op.ne]: null }, embedded: true },
      attributes: ["hnId", "title", "url", "coreIdea", "concepts", "technologies", "entities", "sentiment", "sentimentScore", "controversyPotential", "intellectualDepth", "communityAngle", "time", "score", "by"],
      order: [["time", "DESC"]],
      limit: 200,
    });

    const matchingStories = stories.filter((s) =>
      s.concepts?.some((c) => c.toLowerCase() === conceptName)
    );

    const storyHnIds = matchingStories.map((s) => s.hnId);

    // Find comments that mention this concept OR belong to matching stories
    const comments = await Comment.findAll({
      where: {
        embedded: true,
        [Op.or]: [
          { concepts: { [Op.ne]: null } },
          ...(storyHnIds.length > 0 ? [{ storyHnId: { [Op.in]: storyHnIds } }] : []),
        ],
      },
      attributes: ["hnId", "storyHnId", "text", "by", "time", "argumentSummary", "concepts", "technologies", "entities", "commentType", "sentiment", "sentimentScore"],
      order: [["time", "DESC"]],
      limit: 500,
    });

    const matchingComments = comments.filter((c) =>
      c.concepts?.some((con) => con.toLowerCase() === conceptName)
    );

    res.json({
      concept: conceptName,
      stories: matchingStories.map((s) => ({
        hnId: s.hnId,
        title: s.title,
        url: s.url,
        coreIdea: s.coreIdea,
        concepts: s.concepts,
        technologies: s.technologies,
        entities: s.entities,
        sentiment: s.sentiment,
        sentimentScore: s.sentimentScore,
        controversyPotential: s.controversyPotential,
        intellectualDepth: s.intellectualDepth,
        communityAngle: s.communityAngle,
        time: s.time,
        score: s.score,
        by: s.by,
      })),
      comments: matchingComments.map((c) => ({
        hnId: c.hnId,
        storyHnId: c.storyHnId,
        by: c.by,
        argumentSummary: c.argumentSummary,
        concepts: c.concepts,
        technologies: c.technologies,
        entities: c.entities,
        commentType: c.commentType,
        sentiment: c.sentiment,
        sentimentScore: c.sentimentScore,
        time: c.time,
      })),
      storyCount: matchingStories.length,
      commentCount: matchingComments.length,
    });
  } catch (error) {
    console.error("Error fetching concept detail:", error);
    res.status(500).json({ error: "Failed to fetch concept details" });
  }
});

// GET /api/insights/discourse - What kinds of comments are being made
router.get("/discourse", async (_req: Request, res: Response) => {
  try {
    const comments = await Comment.findAll({
      where: { embedded: true, commentType: { [Op.ne]: null } },
      attributes: ["commentType", "sentiment", "sentimentScore", "argumentSummary", "concepts", "storyHnId", "by"],
      order: [["time", "DESC"]],
      limit: 300,
    });

    const typeDistribution: Record<string, { count: number; avgSentiment: number; sentimentSum: number }> = {};

    for (const c of comments) {
      if (!c.commentType) continue;
      if (!typeDistribution[c.commentType]) {
        typeDistribution[c.commentType] = { count: 0, avgSentiment: 0, sentimentSum: 0 };
      }
      typeDistribution[c.commentType].count++;
      if (c.sentimentScore != null) {
        typeDistribution[c.commentType].sentimentSum += c.sentimentScore;
      }
    }

    for (const key of Object.keys(typeDistribution)) {
      const d = typeDistribution[key];
      d.avgSentiment = d.count > 0 ? d.sentimentSum / d.count : 0;
    }

    // Interesting arguments — highest conviction comments
    const strongArguments = comments
      .filter((c) => c.argumentSummary && c.sentimentScore != null && Math.abs(c.sentimentScore) > 0.5)
      .slice(0, 10)
      .map((c) => ({
        argument: c.argumentSummary,
        type: c.commentType,
        sentiment: c.sentiment,
        by: c.by,
        concepts: c.concepts,
      }));

    res.json({
      commentTypeDistribution: Object.entries(typeDistribution)
        .map(([type, data]) => ({ type, count: data.count, avgSentiment: data.avgSentiment }))
        .sort((a, b) => b.count - a.count),
      strongArguments,
      totalComments: comments.length,
    });
  } catch (error) {
    console.error("Error fetching discourse:", error);
    res.status(500).json({ error: "Failed to fetch discourse data" });
  }
});

// GET /api/insights/timeline - Time-series data for charts
router.get("/timeline", async (req: Request, res: Response) => {
  try {
    // Support time range filtering: ?range=24h|7d|30d|all (default: 24h)
    const range = (req.query.range as string) || "24h";
    const now = Math.floor(Date.now() / 1000);
    let sinceTime = 0;
    switch (range) {
      case "24h": sinceTime = now - 24 * 3600; break;
      case "7d": sinceTime = now - 7 * 24 * 3600; break;
      case "30d": sinceTime = now - 30 * 24 * 3600; break;
      case "all": sinceTime = 0; break;
      default: sinceTime = now - 24 * 3600;
    }

    const timeFilter = sinceTime > 0 ? { time: { [Op.gte]: sinceTime } } : {};

    const stories = await Story.findAll({
      where: { embedded: true, processedAt: { [Op.ne]: null }, ...timeFilter },
      attributes: ["sentiment", "sentimentScore", "controversyPotential", "intellectualDepth", "concepts", "time", "processedAt"],
      order: [["time", "ASC"]],
    });

    const comments = await Comment.findAll({
      where: { embedded: true, processedAt: { [Op.ne]: null }, ...timeFilter },
      attributes: ["commentType", "sentimentScore", "time", "processedAt"],
      order: [["time", "ASC"]],
    });

    // Bucket stories into hourly bins based on HN post time
    const hourBuckets: Record<string, {
      hour: string;
      stories: number;
      comments: number;
      avgSentiment: number;
      sentimentSum: number;
      sentimentCount: number;
      sentimentBreakdown: Record<string, number>;
      controversyBreakdown: Record<string, number>;
      depthBreakdown: Record<string, number>;
      commentTypes: Record<string, number>;
      topConcepts: Record<string, number>;
    }> = {};

    const getHourKey = (unixTime: number) => {
      const d = new Date(unixTime * 1000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:00`;
    };

    const ensureBucket = (hour: string) => {
      if (!hourBuckets[hour]) {
        hourBuckets[hour] = {
          hour,
          stories: 0,
          comments: 0,
          avgSentiment: 0,
          sentimentSum: 0,
          sentimentCount: 0,
          sentimentBreakdown: {},
          controversyBreakdown: {},
          depthBreakdown: {},
          commentTypes: {},
          topConcepts: {},
        };
      }
    };

    for (const s of stories) {
      const hour = getHourKey(s.time);
      ensureBucket(hour);
      const b = hourBuckets[hour];
      b.stories++;
      if (s.sentimentScore != null) {
        b.sentimentSum += s.sentimentScore;
        b.sentimentCount++;
      }
      if (s.sentiment) b.sentimentBreakdown[s.sentiment] = (b.sentimentBreakdown[s.sentiment] || 0) + 1;
      if (s.controversyPotential) b.controversyBreakdown[s.controversyPotential] = (b.controversyBreakdown[s.controversyPotential] || 0) + 1;
      if (s.intellectualDepth) b.depthBreakdown[s.intellectualDepth] = (b.depthBreakdown[s.intellectualDepth] || 0) + 1;
      if (s.concepts) {
        for (const c of s.concepts) {
          const key = c.toLowerCase();
          b.topConcepts[key] = (b.topConcepts[key] || 0) + 1;
        }
      }
    }

    for (const c of comments) {
      const hour = getHourKey(c.time);
      ensureBucket(hour);
      const b = hourBuckets[hour];
      b.comments++;
      if (c.sentimentScore != null) {
        b.sentimentSum += c.sentimentScore;
        b.sentimentCount++;
      }
      if (c.commentType) b.commentTypes[c.commentType] = (b.commentTypes[c.commentType] || 0) + 1;
    }

    const timeline = Object.values(hourBuckets)
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .map((b) => ({
        hour: b.hour,
        stories: b.stories,
        comments: b.comments,
        avgSentiment: b.sentimentCount > 0 ? +(b.sentimentSum / b.sentimentCount).toFixed(3) : 0,
        sentimentBreakdown: b.sentimentBreakdown,
        controversyBreakdown: b.controversyBreakdown,
        depthBreakdown: b.depthBreakdown,
        commentTypes: b.commentTypes,
        topConcepts: Object.entries(b.topConcepts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
      }));

    // Trim the last hour bucket if it's the current hour (incomplete data shows as drop to near-zero)
    const currentHour = getHourKey(Math.floor(Date.now() / 1000));
    const timelineFiltered = timeline.filter((t) => t.hour !== currentHour);

    const totalStories = timelineFiltered.reduce((sum, t) => sum + t.stories, 0);
    const totalComments = timelineFiltered.reduce((sum, t) => sum + t.comments, 0);

    res.json({ timeline: timelineFiltered, totalStories, totalComments, range });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ error: "Failed to fetch timeline data" });
  }
});

// GET /api/insights/entities - Trending companies, products, OSS projects
router.get("/entities", async (_req: Request, res: Response) => {
  try {
    const stories = await Story.findAll({
      where: { entities: { [Op.ne]: null }, embedded: true },
      attributes: ["entities", "sentiment", "sentimentScore", "title", "hnId", "time"],
      order: [["time", "DESC"]],
      limit: 200,
    });

    const comments = await Comment.findAll({
      where: { entities: { [Op.ne]: null }, embedded: true },
      attributes: ["entities", "sentiment", "sentimentScore", "by", "time"],
      order: [["time", "DESC"]],
      limit: 500,
    });

    const entityMap: Record<string, {
      count: number;
      storyCount: number;
      commentCount: number;
      sentimentSum: number;
      sentimentCount: number;
      recentStories: { title: string; hnId: number }[];
      displayName: string;
    }> = {};

    for (const story of stories) {
      if (!story.entities) continue;
      for (const entity of story.entities) {
        const key = entity.toLowerCase().trim();
        if (!key) continue;
        if (!entityMap[key]) {
          entityMap[key] = { count: 0, storyCount: 0, commentCount: 0, sentimentSum: 0, sentimentCount: 0, recentStories: [], displayName: entity };
        }
        entityMap[key].count++;
        entityMap[key].storyCount++;
        if (story.sentimentScore != null) {
          entityMap[key].sentimentSum += story.sentimentScore;
          entityMap[key].sentimentCount++;
        }
        if (entityMap[key].recentStories.length < 3) {
          entityMap[key].recentStories.push({ title: story.title, hnId: story.hnId });
        }
      }
    }

    for (const comment of comments) {
      if (!comment.entities) continue;
      for (const entity of comment.entities) {
        const key = entity.toLowerCase().trim();
        if (!key) continue;
        if (!entityMap[key]) {
          entityMap[key] = { count: 0, storyCount: 0, commentCount: 0, sentimentSum: 0, sentimentCount: 0, recentStories: [], displayName: entity };
        }
        entityMap[key].count++;
        entityMap[key].commentCount++;
        if (comment.sentimentScore != null) {
          entityMap[key].sentimentSum += comment.sentimentScore;
          entityMap[key].sentimentCount++;
        }
      }
    }

    const entities = Object.entries(entityMap)
      .map(([_key, data]) => ({
        name: data.displayName,
        count: data.count,
        storyCount: data.storyCount,
        commentCount: data.commentCount,
        avgSentiment: data.sentimentCount > 0 ? +(data.sentimentSum / data.sentimentCount).toFixed(3) : 0,
        recentStories: data.recentStories,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    res.json({ entities });
  } catch (error) {
    console.error("Error fetching entities:", error);
    res.status(500).json({ error: "Failed to fetch entities" });
  }
});

// GET /api/insights/entities/:name - Stories and comments for a specific entity
router.get("/entities/:name", async (req: Request, res: Response) => {
  try {
    const entityName = decodeURIComponent(req.params.name).toLowerCase();

    const stories = await Story.findAll({
      where: { entities: { [Op.ne]: null }, embedded: true },
      attributes: ["hnId", "title", "url", "coreIdea", "entities", "technologies", "concepts", "sentiment", "sentimentScore", "controversyPotential", "intellectualDepth", "communityAngle", "time", "score", "by"],
      order: [["time", "DESC"]],
      limit: 200,
    });

    const matchingStories = stories.filter((s) =>
      s.entities?.some((e) => e.toLowerCase() === entityName)
    );

    const comments = await Comment.findAll({
      where: { entities: { [Op.ne]: null }, embedded: true },
      attributes: ["hnId", "storyHnId", "by", "time", "argumentSummary", "entities", "technologies", "concepts", "commentType", "sentiment", "sentimentScore"],
      order: [["time", "DESC"]],
      limit: 500,
    });

    const matchingComments = comments.filter((c) =>
      c.entities?.some((e) => e.toLowerCase() === entityName)
    );

    // Aggregate sentiment breakdown
    const sentimentBreakdown: Record<string, number> = {};
    for (const s of matchingStories) {
      if (s.sentiment) sentimentBreakdown[s.sentiment] = (sentimentBreakdown[s.sentiment] || 0) + 1;
    }
    for (const c of matchingComments) {
      if (c.sentiment) sentimentBreakdown[c.sentiment] = (sentimentBreakdown[c.sentiment] || 0) + 1;
    }

    res.json({
      entity: entityName,
      stories: matchingStories.map((s) => ({
        hnId: s.hnId, title: s.title, url: s.url, coreIdea: s.coreIdea,
        concepts: s.concepts, technologies: s.technologies,
        sentiment: s.sentiment, sentimentScore: s.sentimentScore,
        communityAngle: s.communityAngle, time: s.time, score: s.score, by: s.by,
      })),
      comments: matchingComments.map((c) => ({
        hnId: c.hnId, storyHnId: c.storyHnId, by: c.by,
        argumentSummary: c.argumentSummary, concepts: c.concepts,
        technologies: c.technologies, commentType: c.commentType,
        sentiment: c.sentiment, sentimentScore: c.sentimentScore, time: c.time,
      })),
      storyCount: matchingStories.length,
      commentCount: matchingComments.length,
      sentimentBreakdown,
    });
  } catch (error) {
    console.error("Error fetching entity detail:", error);
    res.status(500).json({ error: "Failed to fetch entity details" });
  }
});

// GET /api/insights/discourse/:type - All comments of a specific discourse type
router.get("/discourse/:type", async (req: Request, res: Response) => {
  try {
    const commentType = req.params.type;

    const comments = await Comment.findAll({
      where: { embedded: true, commentType },
      attributes: ["hnId", "storyHnId", "by", "time", "argumentSummary", "concepts", "technologies", "entities", "commentType", "sentiment", "sentimentScore"],
      order: [["time", "DESC"]],
      limit: 100,
    });

    // Get story titles for context
    const storyHnIds = [...new Set(comments.map((c) => c.storyHnId))];
    const stories = storyHnIds.length > 0
      ? await Story.findAll({ where: { hnId: { [Op.in]: storyHnIds } }, attributes: ["hnId", "title"] })
      : [];
    const storyMap = new Map(stories.map((s) => [s.hnId, s.title]));

    // Sentiment breakdown
    const sentimentBreakdown: Record<string, number> = {};
    for (const c of comments) {
      if (c.sentiment) sentimentBreakdown[c.sentiment] = (sentimentBreakdown[c.sentiment] || 0) + 1;
    }

    res.json({
      type: commentType,
      comments: comments.map((c) => ({
        hnId: c.hnId, storyHnId: c.storyHnId, by: c.by,
        storyTitle: storyMap.get(c.storyHnId) || null,
        argumentSummary: c.argumentSummary, concepts: c.concepts,
        technologies: c.technologies, entities: c.entities,
        sentiment: c.sentiment, sentimentScore: c.sentimentScore, time: c.time,
      })),
      totalComments: comments.length,
      sentimentBreakdown,
    });
  } catch (error) {
    console.error("Error fetching discourse detail:", error);
    res.status(500).json({ error: "Failed to fetch discourse details" });
  }
});

export default router;
