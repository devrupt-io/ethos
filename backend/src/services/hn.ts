import axios from "axios";

const HN_API_URL = process.env.HN_API_URL || "https://hacker-news.firebaseio.com/v0";

// HN API has no rate limit per their documentation.
// We use concurrent batch fetching for efficiency.
const BATCH_SIZE = 20;

export interface HNItem {
  id: number;
  type: string;
  by?: string;
  time: number;
  text?: string;
  url?: string;
  title?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
}

export async function fetchTopStoryIds(): Promise<number[]> {
  const response = await axios.get(`${HN_API_URL}/topstories.json`);
  return response.data;
}

export async function fetchNewStoryIds(): Promise<number[]> {
  const response = await axios.get(`${HN_API_URL}/newstories.json`);
  return response.data;
}

export async function fetchBestStoryIds(): Promise<number[]> {
  const response = await axios.get(`${HN_API_URL}/beststories.json`);
  return response.data;
}

// Fetch recently changed items and profiles (for detecting new comments)
export async function fetchUpdates(): Promise<{ items: number[]; profiles: string[] }> {
  const response = await axios.get(`${HN_API_URL}/updates.json`);
  return response.data;
}

export async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const response = await axios.get(`${HN_API_URL}/item/${id}.json`, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 429 || (status && status >= 500)) {
      console.log(`[hn] Rate/server error ${status} for item ${id}, backing off`);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const retry = await axios.get(`${HN_API_URL}/item/${id}.json`, { timeout: 10000 });
        return retry.data;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Fetch multiple items concurrently in batches
export async function fetchItems(ids: number[]): Promise<(HNItem | null)[]> {
  const results: (HNItem | null)[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((id) => fetchItem(id)));
    results.push(...batchResults);
  }
  return results;
}

// Recursively fetch ALL comments for a story (no depth limit)
// Returns a flat list in breadth-first order (all top-level comments first,
// then their children, etc.) with parent info preserved
export async function fetchAllComments(kids: number[]): Promise<HNItem[]> {
  if (!kids || kids.length === 0) return [];

  const comments: HNItem[] = [];
  const items = await fetchItems(kids);

  // Collect child IDs for next level
  const childKids: number[] = [];

  for (const item of items) {
    if (item && item.type === "comment" && !item.deleted && !item.dead) {
      comments.push(item);
      if (item.kids && item.kids.length > 0) {
        childKids.push(...item.kids);
      }
    }
  }

  // Recursively fetch children
  if (childKids.length > 0) {
    const childComments = await fetchAllComments(childKids);
    comments.push(...childComments);
  }

  return comments;
}
