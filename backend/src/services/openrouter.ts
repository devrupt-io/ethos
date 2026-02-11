import axios, { AxiosError } from "axios";

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || "qwen/qwen3-embedding-8b";
const CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || "meta-llama/llama-3.1-8b-instruct";

// Only include reasoning parameter for models that support it (e.g. Qwen)
const REASONING_PARAMS = CHAT_MODEL.startsWith("qwen/") ? { reasoning: { enabled: false } } : {};

// Parse JSON robustly — handles extra text before/after JSON or truncated output
function parseJsonResponse(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON object from the response
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse JSON from response: ${content.slice(0, 200)}`);
  }
}

// Bump this when prompts or schemas change significantly to trigger regeneration
export const ANALYSIS_VERSION = "6";

const client = axios.create({
  baseURL: OPENROUTER_API_URL,
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://ethos.devrupt.io",
    "X-Title": "Ethos",
  },
  timeout: 120000,
});

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 4): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const axiosErr = error as AxiosError<any>;
      const status = axiosErr.response?.status;

      // Provider-specific 400 errors — retry (OpenRouter may route to a different provider)
      if (status === 400 && axiosErr.response?.data?.error?.metadata?.provider_name && attempt < maxRetries) {
        const provider = axiosErr.response.data.error.metadata.provider_name;
        const raw = axiosErr.response.data.error.metadata.raw || "";
        const errMsg = axiosErr.response.data.error.message || "";
        const delay = 2000 * (attempt + 1);
        console.log(`[openrouter] Provider ${provider} returned 400, retrying (${attempt + 1}/${maxRetries})`);
        console.log(`[openrouter]   error: ${errMsg}`);
        console.log(`[openrouter]   raw: ${raw}`);
        console.log(`[openrouter]   request model: ${(axiosErr.config as any)?.data ? JSON.parse((axiosErr.config as any).data).model : "unknown"}`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(axiosErr.response?.headers?.["retry-after"] || "0") * 1000;
        const delay = Math.max(retryAfter, 3000 * Math.pow(2, attempt));
        console.log(`[openrouter] Rate limited, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (attempt < maxRetries && status && status >= 500) {
        const delay = 2000 * Math.pow(2, attempt);
        console.log(`[openrouter] Server error ${status}, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (axiosErr.response?.data) {
        const reqData = (axiosErr.config as any)?.data ? JSON.parse((axiosErr.config as any).data) : {};
        console.error(`[openrouter] API error ${status}: ${JSON.stringify(axiosErr.response.data).slice(0, 500)}`);
        console.error(`[openrouter]   model: ${reqData.model || "unknown"}, temperature: ${reqData.temperature}, has_response_format: ${!!reqData.response_format}`);
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const response = await client.post("/embeddings", {
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
      provider: { require_parameters: true },
    });
    return response.data.data[0].embedding;
  });
}

// Structured output schema for story analysis
const storyAnalysisSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "story_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        core_idea: {
          type: "string",
          description: "The fundamental concept or idea being discussed, abstracted beyond the specific story. E.g. 'decentralized identity systems' not 'Company X launches product Y'",
        },
        concepts: {
          type: "array",
          items: { type: "string" },
          description: "3-7 abstract concepts, themes, or philosophies. Use lowercase with spaces (e.g. 'open source sustainability', 'surveillance capitalism', 'right to repair'). These should be IDEAS, not products or companies. Avoid underscores.",
        },
        technologies: {
          type: "array",
          items: { type: "string" },
          description: "Specific technologies, programming languages, frameworks, tools, platforms, or protocols mentioned or relevant. Use their canonical names (e.g. 'Rust', 'PostgreSQL', 'Kubernetes', 'WebAssembly'). Return empty array if none.",
        },
        entities: {
          type: "array",
          items: { type: "string" },
          description: "Companies, organizations, brands, products, services, and notable open-source projects mentioned. Use canonical names (e.g. 'OpenAI', 'Google', 'ChatGPT', 'Linux Foundation', 'Hetzner', 'Stripe'). Return empty array if none.",
        },
        community_angle: {
          type: "string",
          description: "Why would the HN community specifically care about this? What nerve does it touch?",
        },
        sentiment: {
          type: "string",
          enum: ["very_negative", "negative", "mixed", "neutral", "positive", "very_positive"],
          description: "Expected community sentiment toward this topic. Use the full range: product launches and positive tech may be 'positive', but privacy violations, layoffs, vendor lock-in, and enshittification should be 'negative' or 'very_negative'. Don't default to 'mixed' — commit to a direction.",
        },
        sentiment_score: {
          type: "number",
          description: "Sentiment from -1.0 (very negative) to 1.0 (very positive). Use the full range. Negative stories should have negative scores.",
        },
        controversy_potential: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How likely this is to generate heated debate. Topics like AI ethics, language wars, FAANG criticism, remote work debates, and licensing changes tend to be 'high'.",
        },
        intellectual_depth: {
          type: "string",
          enum: ["surface", "moderate", "deep"],
          description: "How intellectually substantive the content is. Product announcements, Show HN demos, and link aggregation are typically 'surface'. Technical deep-dives, research papers, and philosophical essays are 'deep'. Use 'surface' freely — most HN submissions are not deep.",
        },
      },
      required: ["core_idea", "concepts", "technologies", "entities", "community_angle", "sentiment", "sentiment_score", "controversy_potential", "intellectual_depth"],
      additionalProperties: false,
    },
  },
};

// Structured output schema for comment analysis
const commentAnalysisSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "comment_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        argument_summary: {
          type: "string",
          description: "A direct paraphrase of the argument or point being made. Lead with the substance, not 'The commenter'. Example: 'Responsive design remains neglected on developer blogs.' NOT 'The commenter suggests improving responsiveness.'",
        },
        concepts: {
          type: "array",
          items: { type: "string" },
          description: "2-5 abstract concepts or ideas this comment engages with. Use lowercase with spaces (e.g. 'type safety', 'vendor lock-in'). Avoid underscores.",
        },
        technologies: {
          type: "array",
          items: { type: "string" },
          description: "Specific technologies, languages, frameworks, tools mentioned. Use canonical names (e.g. 'Python', 'Docker', 'React'). Return empty array if none.",
        },
        entities: {
          type: "array",
          items: { type: "string" },
          description: "Companies, products, services, or notable OSS projects mentioned. Use canonical names (e.g. 'AWS', 'Vercel', 'SQLite'). Return empty array if none.",
        },
        comment_type: {
          type: "string",
          enum: ["technical_insight", "personal_experience", "counterargument", "question", "humor", "meta_commentary", "resource_sharing", "agreement", "criticism", "tangent"],
          description: "What kind of contribution is this comment making to the discussion?",
        },
        sentiment: {
          type: "string",
          enum: ["very_negative", "negative", "mixed", "neutral", "positive", "very_positive"],
          description: "Emotional tone of this comment. Frustrated rants and harsh criticism should be 'negative' or 'very_negative'. Enthusiastic praise should be 'positive' or 'very_positive'. Don't default to 'mixed'.",
        },
        sentiment_score: {
          type: "number",
          description: "Sentiment from -1.0 (very negative) to 1.0 (very positive). Use the full range. Angry, dismissive, or frustrated comments should have negative scores.",
        },
      },
      required: ["argument_summary", "concepts", "technologies", "entities", "comment_type", "sentiment", "sentiment_score"],
      additionalProperties: false,
    },
  },
};

export interface StoryAnalysis {
  core_idea: string;
  concepts: string[];
  technologies: string[];
  entities: string[];
  community_angle: string;
  sentiment: string;
  sentiment_score: number;
  controversy_potential: string;
  intellectual_depth: string;
}

export interface CommentAnalysis {
  argument_summary: string;
  concepts: string[];
  technologies: string[];
  entities: string[];
  comment_type: string;
  sentiment: string;
  sentiment_score: number;
}

export async function analyzeStory(title: string, text: string, url: string | null): Promise<StoryAnalysis> {
  const content = `Title: ${title}\n${url ? `URL: ${url}\n` : ""}${text ? `Content: ${text.slice(0, 3000)}` : ""}`;

  const systemPrompt = `You are an expert analyst of the Hacker News community. Analyze submissions for the underlying ideas, concepts, technologies, and entities being discussed.

Write all summaries in third-person analytical prose. Do NOT start sentences with "The user", "The commenter", "The author", or "This post". Instead, lead with the substance: describe the idea, argument, or phenomenon directly.

Good: "Decentralized identity systems could reduce reliance on corporate gatekeepers."
Bad: "The user discusses how decentralized identity systems work."`;

  const userPrompt = `Analyze this Hacker News submission:\n\n${content}`;

  return withRetry(async () => {
    const response = await client.post("/chat/completions", {
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: storyAnalysisSchema,
      ...REASONING_PARAMS,
      plugins: [{ id: "response-healing" }],
      provider: { require_parameters: true },
      temperature: 0,
      max_tokens: 1024,
    });
    return parseJsonResponse(response.data.choices[0].message.content);
  });
}

export async function analyzeComment(commentText: string, storyTitle: string, parentContext?: string): Promise<CommentAnalysis> {
  const systemPrompt = `You are an expert analyst of Hacker News discussions. Identify core arguments, intellectual contributions, and emotional undertones in comments.

Write the argument_summary as a direct, substantive statement — as if you are paraphrasing what was said. Lead with the actual claim, opinion, or observation. Never begin with "The commenter", "The user", "The author", "This comment", or any similar framing. Write as though restating the argument itself.

Good examples:
- "Responsive web design remains neglected on many developer blogs despite being table stakes."
- "Selenium-based automation may outperform newer tools because LLMs have extensive Selenium training data."
- "Type-safe languages prevent entire categories of runtime bugs, making the upfront cost worthwhile."

Bad examples:
- "The commenter suggests improving the blog's responsiveness."
- "The user argues that Selenium would be better."
- "This comment discusses type safety benefits."`;

  let userPrompt = `This comment was made on the HN story "${storyTitle}"`;
  if (parentContext) {
    userPrompt += `\n\nThe parent comment's argument: "${parentContext}"`;
  }
  userPrompt += `\n\nComment:\n${commentText.slice(0, 2000)}`;

  return withRetry(async () => {
    const response = await client.post("/chat/completions", {
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: commentAnalysisSchema,
      ...REASONING_PARAMS,
      plugins: [{ id: "response-healing" }],
      provider: { require_parameters: true },
      temperature: 0,
      max_tokens: 512,
    });
    return parseJsonResponse(response.data.choices[0].message.content);
  });
}

export async function testConnection(): Promise<boolean> {
  try {
    const response = await client.post("/chat/completions", {
      model: CHAT_MODEL,
      messages: [{ role: "user", content: "Say 'ok'" }],
      ...REASONING_PARAMS,
      max_tokens: 10,
    });
    return response.data.choices && response.data.choices.length > 0;
  } catch (error: any) {
    console.error("OpenRouter connection test failed:", error?.message || error);
    return false;
  }
}
