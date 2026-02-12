import { Story, Comment } from "../models";
import * as hn from "./hn";
import * as openrouter from "./openrouter";
import { ANALYSIS_VERSION } from "./openrouter";
import * as chroma from "./chroma";
import { Op } from "sequelize";

function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalize concept strings: lowercase, spaces instead of underscores, trim
function normalizeConcepts(concepts: string[]): string[] {
  return concepts.map((c) =>
    c.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim()
  ).filter((c) => c.length > 0);
}

// Configurable via environment
const MAX_AGE_HOURS = parseInt(process.env.HN_MAX_AGE_HOURS || "8");
const MAX_STORIES = parseInt(process.env.HN_MAX_STORIES || "0"); // 0 = unlimited (process all)
const MAX_COMMENTS_PER_STORY = parseInt(process.env.HN_MAX_COMMENTS_PER_STORY || "0"); // 0 = unlimited
const NEW_COMMENTS_BATCH = parseInt(process.env.HN_NEW_COMMENTS_BATCH || "10"); // max new comments to analyze per story per cycle
const LLM_DELAY_MS = parseInt(process.env.HN_LLM_DELAY_MS || "200"); // delay between LLM calls only

// Worker state exposed for health endpoint
export const workerState = {
  running: false,
  lastRunAt: null as Date | null,
  lastRunResult: null as { ingested: number; skipped: number; tooOld: number; errors: number; commentsProcessed: number; newComments: number } | null,
  totalProcessed: 0,
  totalEmbedded: 0,
  currentlyProcessing: null as string | null,
  cycleStartedAt: null as number | null,
  cycleTotal: 0,
  cycleCurrent: 0,
  cyclePhase: null as string | null,
  errors: [] as string[],
};

function isRecent(unixTime: number): boolean {
  const ageMs = Date.now() - unixTime * 1000;
  return ageMs <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

// Pass 1: Ingest or update a story (no comment processing)
async function processStoryOnly(hnId: number): Promise<{ result: "new" | "cached" | "too_old" | "error"; item: hn.HNItem | null }> {
  const existing = await Story.findOne({ where: { hnId } });

  const item = await hn.fetchItem(hnId);
  if (!item || item.type !== "story") return { result: existing ? "cached" : "error", item: null };

  if (!isRecent(item.time)) return { result: "too_old", item };

  if (!existing) {
    workerState.currentlyProcessing = item.title || `story ${hnId}`;
    console.log(`[worker] Processing new story ${hnId}: "${item.title}"`);

    const story = await Story.create({
      hnId: item.id,
      title: item.title || "",
      url: item.url || null,
      text: item.text || null,
      by: item.by || "unknown",
      score: item.score || 0,
      time: item.time,
      descendants: item.descendants || 0,
    });

    const rawText = stripHtml(item.text);
    const textForAnalysis = `${item.title || ""} ${rawText}`.trim();
    if (textForAnalysis.length > 0) {
      try {
        const analysis = await openrouter.analyzeStory(item.title || "", rawText, item.url || null);
        const concepts = normalizeConcepts(analysis.concepts || []);
        const entities = analysis.entities || [];
        const technologies = analysis.technologies || [];
        const embeddingText = `${analysis.core_idea || ""}. Concepts: ${concepts.join(", ")}. ${analysis.community_angle || ""}. Entities: ${entities.join(", ")}`;
        const embedding = await openrouter.generateEmbedding(embeddingText);

        await story.update({
          coreIdea: analysis.core_idea || "",
          concepts,
          technologies,
          entities,
          communityAngle: analysis.community_angle || "",
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentiment_score,
          controversyPotential: analysis.controversy_potential,
          intellectualDepth: analysis.intellectual_depth,
          analysisVersion: ANALYSIS_VERSION,
          embedded: true,
          processedAt: new Date(),
        });

        await chroma.addStoryEmbedding(item.id, embedding, {
          hnId: item.id,
          title: item.title || "",
          coreIdea: analysis.core_idea,
          sentiment: analysis.sentiment,
          controversyPotential: analysis.controversy_potential,
          intellectualDepth: analysis.intellectual_depth,
          concepts: JSON.stringify(analysis.concepts),
          time: item.time,
          score: item.score || 0,
        });

        workerState.totalEmbedded++;
        if (LLM_DELAY_MS > 0) await new Promise((r) => setTimeout(r, LLM_DELAY_MS));
      } catch (err: any) {
        console.error(`[worker] Failed to analyze story ${hnId}: ${err?.message || err}`);
        workerState.errors.push(`story ${hnId}: ${err?.message || "unknown"}`);
        if (workerState.errors.length > 50) workerState.errors.shift();
      }
    }

    workerState.totalProcessed++;
    return { result: "new", item };
  }

  // Existing story — update score/descendants
  await existing.update({
    score: item.score || existing.score,
    descendants: item.descendants || existing.descendants,
  });
  return { result: "cached", item };
}

// Process comments for a story — fetch only top-level kids and limit new analyses per cycle
async function processStoryComments(item: hn.HNItem): Promise<{ commentsProcessed: number; newComments: number }> {
  let commentsProcessed = 0;
  let newComments = 0;

  if (!item.kids || item.kids.length === 0) return { commentsProcessed, newComments };

  // Fetch only the direct children (top-level comments) — not the full recursive tree
  // This keeps per-story work bounded and predictable
  const topLevelItems = await hn.fetchItems(item.kids);
  const validComments = topLevelItems.filter(
    (c): c is hn.HNItem => c !== null && c.type === "comment" && !c.deleted && !c.dead
  );
  const toProcess = MAX_COMMENTS_PER_STORY > 0 ? validComments.slice(0, MAX_COMMENTS_PER_STORY) : validComments;

  // Build a map of parent comment summaries for context
  const parentSummaryMap = new Map<number, string>();

  // Load existing comment summaries from DB for context
  const existingCommentIds = toProcess.map((c) => c.id);
  const existingComments = await Comment.findAll({
    where: { hnId: { [Op.in]: existingCommentIds } },
    attributes: ["hnId", "argumentSummary"],
  });
  for (const ec of existingComments) {
    if (ec.argumentSummary) {
      parentSummaryMap.set(ec.hnId, ec.argumentSummary);
    }
  }
  const existingSet = new Set(existingComments.map((c) => c.hnId));

  for (const ci of toProcess) {
    if (existingSet.has(ci.id)) {
      commentsProcessed++;
      continue;
    }

    // Stop if we've hit the new comments batch limit for this story
    if (NEW_COMMENTS_BATCH > 0 && newComments >= NEW_COMMENTS_BATCH) {
      break;
    }

    const parentContext = ci.parent ? parentSummaryMap.get(ci.parent) : undefined;
    const ok = await processComment(ci, item.id, item.title || "", parentContext);
    if (ok) {
      newComments++;
      const newComment = await Comment.findOne({ where: { hnId: ci.id }, attributes: ["argumentSummary"] });
      if (newComment?.argumentSummary) {
        parentSummaryMap.set(ci.id, newComment.argumentSummary);
      }
      if (LLM_DELAY_MS > 0) await new Promise((r) => setTimeout(r, LLM_DELAY_MS));
    }
    commentsProcessed++;
  }

  if (newComments > 0) {
    console.log(`[worker]   └─ story ${item.id}: ${newComments} new comments, ${commentsProcessed - newComments} cached`);
  }

  return { commentsProcessed, newComments };
}

async function processComment(ci: hn.HNItem, storyHnId: number, storyTitle: string, parentContext?: string): Promise<boolean> {
  try {
    const comment = await Comment.create({
      hnId: ci.id,
      storyHnId,
      parentHnId: ci.parent || null,
      text: ci.text || null,
      by: ci.by || null,
      time: ci.time,
    });

    const commentText = stripHtml(ci.text);
    if (commentText.length > 30) {
      try {
        const analysis = await openrouter.analyzeComment(commentText, storyTitle, parentContext);
        const concepts = normalizeConcepts(analysis.concepts || []);
        const embeddingText = `${analysis.argument_summary || ""}. Concepts: ${concepts.join(", ")}`;
        const embedding = await openrouter.generateEmbedding(embeddingText);

        await comment.update({
          argumentSummary: analysis.argument_summary || "",
          concepts: concepts,
          technologies: analysis.technologies || [],
          entities: analysis.entities || [],
          commentType: analysis.comment_type || "meta_commentary",
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentiment_score,
          analysisVersion: ANALYSIS_VERSION,
          embedded: true,
          processedAt: new Date(),
        });

        await chroma.addCommentEmbedding(ci.id, embedding, {
          hnId: ci.id,
          storyHnId,
          by: ci.by || "unknown",
          commentType: analysis.comment_type || "meta_commentary",
          sentiment: analysis.sentiment,
          concepts: JSON.stringify(concepts),
          time: ci.time,
        });

        workerState.totalEmbedded++;
        return true;
      } catch (err: any) {
        console.error(`[worker] Failed to analyze comment ${ci.id}: ${err?.message || err}`);
      }
    }
  } catch (err: any) {
    // Likely unique constraint violation — comment was inserted concurrently
    if (err?.name === "SequelizeUniqueConstraintError") return false;
    console.error(`[worker] Failed to process comment ${ci.id}: ${err?.message || err}`);
  }
  return false;
}

async function runIngestionCycle(): Promise<{ ingested: number; skipped: number; tooOld: number; errors: number; commentsProcessed: number; newComments: number }> {
  // Fetch from multiple HN endpoints and deduplicate
  const [topIds, newIds] = await Promise.all([
    hn.fetchTopStoryIds(),
    hn.fetchNewStoryIds(),
  ]);
  const uniqueIds = [...new Set([...topIds, ...newIds])];
  const toProcess = MAX_STORIES > 0 ? uniqueIds.slice(0, MAX_STORIES) : uniqueIds;

  console.log(`[worker] Fetched ${topIds.length} top + ${newIds.length} new story IDs (${uniqueIds.length} unique), processing ${MAX_STORIES > 0 ? `up to ${toProcess.length}` : "all"} (max age: ${MAX_AGE_HOURS}h)`);

  let ingested = 0;
  let skipped = 0;
  let tooOld = 0;
  let errors = 0;
  let totalCommentsProcessed = 0;
  let totalNewComments = 0;

  // Update cycle progress tracking
  workerState.cycleTotal = toProcess.length;
  workerState.cycleCurrent = 0;
  workerState.cyclePhase = "stories+comments";

  // Breadth-first: process each story and its comments together before moving on
  for (const hnId of toProcess) {
    workerState.cycleCurrent++;

    try {
      const { result, item } = await processStoryOnly(hnId);
      switch (result) {
        case "new":
          ingested++;
          console.log(`[worker] [${workerState.cycleCurrent}/${toProcess.length}] ✓ Story ${hnId}: "${item?.title}" — analyzed & embedded`);
          break;
        case "cached":
          skipped++;
          break;
        case "too_old":
          tooOld++;
          break;
        case "error":
          errors++;
          break;
      }

      // Track every story processed (not just new) so avgTimePerStory works
      workerState.totalProcessed++;

      // Immediately process comments for this story (breadth-first)
      if (item && (result === "new" || result === "cached")) {
        try {
          workerState.currentlyProcessing = `comments for: ${item.title || `story ${item.id}`}`;
          const { commentsProcessed, newComments } = await processStoryComments(item);
          totalCommentsProcessed += commentsProcessed;
          totalNewComments += newComments;
        } catch (err: any) {
          console.error(`[worker] Failed to process comments for story ${item.id}: ${err?.message || err}`);
        }
      }

      // Log progress every 50 stories
      if (workerState.cycleCurrent % 50 === 0) {
        console.log(`[worker] Progress: ${workerState.cycleCurrent}/${toProcess.length} stories, ${ingested} new, ${totalNewComments} new comments`);
      }
    } catch (err: any) {
      console.error(`[worker] Failed to process story ${hnId}: ${err?.message || err}`);
      errors++;
      workerState.totalProcessed++;
    }
  }

  return { ingested, skipped, tooOld, errors, commentsProcessed: totalCommentsProcessed, newComments: totalNewComments };
}

let workerInterval: ReturnType<typeof setInterval> | null = null;
let cycleRunning = false;

export function startBackgroundWorker(): void {
  if (workerState.running) return;

  const pollInterval = parseInt(process.env.HN_POLL_INTERVAL || "300") * 1000;

  console.log(`[worker] Starting background worker`);
  console.log(`[worker]   poll interval: ${pollInterval / 1000}s, max age: ${MAX_AGE_HOURS}h, max stories: ${MAX_STORIES === 0 ? "unlimited" : MAX_STORIES}`);
  console.log(`[worker]   max comments/story: ${MAX_COMMENTS_PER_STORY === 0 ? "unlimited" : MAX_COMMENTS_PER_STORY}, new comment batch: ${NEW_COMMENTS_BATCH}, LLM delay: ${LLM_DELAY_MS}ms`);
  workerState.running = true;

  // Run immediately on startup
  runCycle();

  // Then run on interval
  workerInterval = setInterval(runCycle, pollInterval);
}

async function runCycle(): Promise<void> {
  if (cycleRunning) {
    console.log("[worker] Previous cycle still running, skipping");
    return;
  }

  cycleRunning = true;
  console.log("[worker] ── Ingestion cycle starting ──");
  const startTime = Date.now();
  workerState.cycleStartedAt = startTime;
  try {
    const result = await runIngestionCycle();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    workerState.lastRunAt = new Date();
    workerState.lastRunResult = result;
    workerState.currentlyProcessing = null;
    workerState.cyclePhase = null;
    console.log(`[worker] ── Cycle complete in ${elapsed}s: ${result.ingested} new stories, ${result.skipped} cached, ${result.tooOld} too old, ${result.errors} errors, ${result.newComments} new comments (${result.commentsProcessed} total) ──`);
  } catch (err: any) {
    console.error(`[worker] ── Cycle failed: ${err?.message || err} ──`);
    workerState.currentlyProcessing = null;
    workerState.cyclePhase = null;
    workerState.errors.push(`cycle: ${err?.message || "unknown"}`);
    if (workerState.errors.length > 50) workerState.errors.shift();
  } finally {
    cycleRunning = false;
  }
}

// Background regeneration queue
let regenerationRunning = false;

export async function queueRegeneration(options: {
  targetVersion?: string;
  maxItems?: number;
  type?: "all" | "stories" | "comments";
  since?: string;
  until?: string;
}): Promise<{ queued: boolean; message: string }> {
  if (regenerationRunning) {
    return { queued: false, message: "Regeneration already in progress" };
  }

  regenerationRunning = true;
  // Run in background — don't await
  runRegeneration(options).finally(() => { regenerationRunning = false; });
  return { queued: true, message: "Regeneration started in background" };
}

export function isRegenerationRunning(): boolean {
  return regenerationRunning;
}

async function runRegeneration(options: {
  targetVersion?: string;
  maxItems?: number;
  type?: string;
  since?: string;
  until?: string;
}): Promise<void> {
  const { targetVersion, maxItems = 50, type = "all", since, until } = options;
  const versionFilter = targetVersion || ANALYSIS_VERSION;
  const timeFilters: any = {};
  if (since) timeFilters[Op.gte] = Math.floor(new Date(since).getTime() / 1000);
  if (until) timeFilters[Op.lte] = Math.floor(new Date(until).getTime() / 1000);
  const timeWhere = Object.keys(timeFilters).length > 0 ? { time: timeFilters } : {};

  let storiesRegenerated = 0;
  let commentsRegenerated = 0;
  const errors: string[] = [];

  console.log(`[regen] Starting regeneration: version=${versionFilter}, type=${type}, max=${maxItems}`);

  if (type === "all" || type === "stories") {
    const storiesToRegen = await Story.findAll({
      where: {
        embedded: true,
        [Op.or]: [
          { analysisVersion: { [Op.ne]: versionFilter } },
          { analysisVersion: null },
        ],
        ...timeWhere,
      },
      limit: maxItems,
      order: [["time", "DESC"]],
    });

    for (const story of storiesToRegen) {
      try {
        const rawText = stripHtml(story.text);
        const analysis = await openrouter.analyzeStory(story.title, rawText, story.url);
        const concepts = normalizeConcepts(analysis.concepts);
        const embeddingText = `${analysis.core_idea}. Concepts: ${concepts.join(", ")}. ${analysis.community_angle}. Entities: ${(analysis.entities || []).join(", ")}`;
        const embedding = await openrouter.generateEmbedding(embeddingText);

        await story.update({
          coreIdea: analysis.core_idea,
          concepts,
          technologies: analysis.technologies || [],
          entities: analysis.entities || [],
          communityAngle: analysis.community_angle,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentiment_score,
          controversyPotential: analysis.controversy_potential,
          intellectualDepth: analysis.intellectual_depth,
          analysisVersion: versionFilter,
          processedAt: new Date(),
        });

        await chroma.addStoryEmbedding(story.hnId, embedding, {
          hnId: story.hnId,
          title: story.title,
          coreIdea: analysis.core_idea,
          sentiment: analysis.sentiment,
          controversyPotential: analysis.controversy_potential,
          intellectualDepth: analysis.intellectual_depth,
          concepts: JSON.stringify(concepts),
          time: story.time,
          score: story.score,
        });

        storiesRegenerated++;
        if (LLM_DELAY_MS > 0) await new Promise((r) => setTimeout(r, LLM_DELAY_MS));
      } catch (err: any) {
        errors.push(`story ${story.hnId}: ${err?.message}`);
      }
    }
  }

  if (type === "all" || type === "comments") {
    const commentsToRegen = await Comment.findAll({
      where: {
        embedded: true,
        [Op.or]: [
          { analysisVersion: { [Op.ne]: versionFilter } },
          { analysisVersion: null },
        ],
        ...timeWhere,
      },
      limit: maxItems,
      order: [["time", "DESC"]],
    });

    for (const comment of commentsToRegen) {
      try {
        const commentText = stripHtml(comment.text);
        if (commentText.length <= 30) continue;

        const story = await Story.findOne({ where: { hnId: comment.storyHnId } });
        const storyTitle = story?.title || "Unknown Story";

        // Get parent context if available
        let parentContext: string | undefined;
        if (comment.parentHnId) {
          const parent = await Comment.findOne({ where: { hnId: comment.parentHnId }, attributes: ["argumentSummary"] });
          parentContext = parent?.argumentSummary || undefined;
        }

        const analysis = await openrouter.analyzeComment(commentText, storyTitle, parentContext);
        const concepts = normalizeConcepts(analysis.concepts);
        const embeddingText = `${analysis.argument_summary}. Concepts: ${concepts.join(", ")}`;
        const embedding = await openrouter.generateEmbedding(embeddingText);

        await comment.update({
          argumentSummary: analysis.argument_summary,
          concepts,
          technologies: analysis.technologies || [],
          entities: analysis.entities || [],
          commentType: analysis.comment_type,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentiment_score,
          analysisVersion: versionFilter,
          processedAt: new Date(),
        });

        await chroma.addCommentEmbedding(comment.hnId, embedding, {
          hnId: comment.hnId,
          storyHnId: comment.storyHnId,
          by: comment.by || "unknown",
          commentType: analysis.comment_type,
          sentiment: analysis.sentiment,
          concepts: JSON.stringify(concepts),
          time: comment.time,
        });

        commentsRegenerated++;
        if (LLM_DELAY_MS > 0) await new Promise((r) => setTimeout(r, LLM_DELAY_MS));
      } catch (err: any) {
        errors.push(`comment ${comment.hnId}: ${err?.message}`);
      }
    }
  }

  console.log(`[regen] Complete: ${storiesRegenerated} stories, ${commentsRegenerated} comments, ${errors.length} errors`);
  if (errors.length > 0) {
    console.log(`[regen] Errors: ${errors.slice(0, 5).join("; ")}`);
  }
}

export async function semanticSearch(
  query: string,
  type: "stories" | "comments" = "stories",
  limit: number = 10
): Promise<any[]> {
  const queryEmbedding = await openrouter.generateEmbedding(query);

  if (type === "stories") {
    const results = await chroma.searchSimilarStories(queryEmbedding, limit);
    if (!results.ids || results.ids.length === 0 || results.ids[0].length === 0) {
      return [];
    }

    const hnIds = results.metadatas[0].map((m: any) => m.hnId);
    const stories = await Story.findAll({ where: { hnId: hnIds } });

    const storyMap = new Map(stories.map((s) => [s.hnId, s]));
    return hnIds
      .map((id: number, i: number) => {
        const story = storyMap.get(id);
        if (!story) return null;
        return {
          ...story.toJSON(),
          similarity: results.distances?.[0]?.[i] != null ? 1 - results.distances[0][i] : null,
        };
      })
      .filter(Boolean);
  } else {
    const results = await chroma.searchSimilarComments(queryEmbedding, limit);
    if (!results.ids || results.ids.length === 0 || results.ids[0].length === 0) {
      return [];
    }

    const hnIds = results.metadatas[0].map((m: any) => m.hnId);
    const comments = await Comment.findAll({ where: { hnId: hnIds } });
    const commentMap = new Map(comments.map((c) => [c.hnId, c]));

    return hnIds
      .map((id: number, i: number) => {
        const comment = commentMap.get(id);
        if (!comment) return null;
        return {
          ...comment.toJSON(),
          similarity: results.distances?.[0]?.[i] != null ? 1 - results.distances[0][i] : null,
        };
      })
      .filter(Boolean);
  }
}
