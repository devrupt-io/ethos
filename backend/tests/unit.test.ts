import { stripHtml } from "./helpers";

describe("Utility Functions", () => {
  describe("stripHtml", () => {
    it("should strip HTML tags", () => {
      expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
    });

    it("should decode HTML entities", () => {
      expect(stripHtml("&amp; &lt; &gt; &quot; &#x27;")).toBe('& < > " \'');
    });

    it("should handle null/undefined input", () => {
      expect(stripHtml(null)).toBe("");
      expect(stripHtml(undefined)).toBe("");
    });

    it("should collapse whitespace", () => {
      expect(stripHtml("hello   world")).toBe("hello world");
    });
  });
});

describe("Models", () => {
  it("should export Story and Comment models", () => {
    // Validate models can be imported without connection errors
    const { Story, Comment } = require("../src/models");
    expect(Story).toBeDefined();
    expect(Comment).toBeDefined();
  });
});

describe("HN Service", () => {
  it("should export required functions", () => {
    const hn = require("../src/services/hn");
    expect(hn.fetchTopStoryIds).toBeDefined();
    expect(hn.fetchNewStoryIds).toBeDefined();
    expect(hn.fetchBestStoryIds).toBeDefined();
    expect(hn.fetchItem).toBeDefined();
    expect(hn.fetchAllComments).toBeDefined();
  });
});

describe("API Routes", () => {
  it("should export story routes", () => {
    const stories = require("../src/routes/stories");
    expect(stories.default).toBeDefined();
  });

  it("should export comment routes", () => {
    const comments = require("../src/routes/comments");
    expect(comments.default).toBeDefined();
  });

  it("should export search routes", () => {
    const search = require("../src/routes/search");
    expect(search.default).toBeDefined();
  });

  it("should export health routes", () => {
    const health = require("../src/routes/health");
    expect(health.default).toBeDefined();
  });

  it("should export insights routes", () => {
    const insights = require("../src/routes/insights");
    expect(insights.default).toBeDefined();
  });
});

describe("Ingestion Service", () => {
  it("should export worker state and startBackgroundWorker", () => {
    const ingestion = require("../src/services/ingestion");
    expect(ingestion.workerState).toBeDefined();
    expect(ingestion.workerState.running).toBe(false);
    expect(ingestion.startBackgroundWorker).toBeDefined();
    expect(ingestion.semanticSearch).toBeDefined();
    expect(ingestion.queueRegeneration).toBeDefined();
    expect(ingestion.isRegenerationRunning).toBeDefined();
  });
});

describe("OpenRouter Service", () => {
  it("should export analysis and embedding functions", () => {
    const openrouter = require("../src/services/openrouter");
    expect(openrouter.generateEmbedding).toBeDefined();
    expect(openrouter.analyzeStory).toBeDefined();
    expect(openrouter.analyzeComment).toBeDefined();
    expect(openrouter.testConnection).toBeDefined();
  });
});
