import { ChromaClient, Collection } from "chromadb";

const CHROMA_HOST = process.env.CHROMA_HOST || "localhost";
const CHROMA_PORT = parseInt(process.env.CHROMA_PORT || "8000");

let client: ChromaClient | null = null;
let storyCollection: Collection | null = null;
let commentCollection: Collection | null = null;

export async function getClient(): Promise<ChromaClient> {
  if (!client) {
    client = new ChromaClient({
      path: `http://${CHROMA_HOST}:${CHROMA_PORT}`,
    });
  }
  return client;
}

export async function getStoryCollection(): Promise<Collection> {
  if (!storyCollection) {
    const c = await getClient();
    storyCollection = await c.getOrCreateCollection({
      name: "stories",
      metadata: { "hnsw:space": "cosine" },
    });
  }
  return storyCollection;
}

export async function getCommentCollection(): Promise<Collection> {
  if (!commentCollection) {
    const c = await getClient();
    commentCollection = await c.getOrCreateCollection({
      name: "comments",
      metadata: { "hnsw:space": "cosine" },
    });
  }
  return commentCollection;
}

export async function addStoryEmbedding(
  hnId: number,
  embedding: number[],
  metadata: Record<string, any>
): Promise<void> {
  const collection = await getStoryCollection();
  await collection.upsert({
    ids: [`story_${hnId}`],
    embeddings: [embedding],
    metadatas: [metadata],
  });
}

export async function addCommentEmbedding(
  hnId: number,
  embedding: number[],
  metadata: Record<string, any>
): Promise<void> {
  const collection = await getCommentCollection();
  await collection.upsert({
    ids: [`comment_${hnId}`],
    embeddings: [embedding],
    metadatas: [metadata],
  });
}

export async function searchSimilarStories(
  queryEmbedding: number[],
  nResults: number = 10
): Promise<any> {
  const collection = await getStoryCollection();
  return collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
  });
}

export async function searchSimilarComments(
  queryEmbedding: number[],
  nResults: number = 10
): Promise<any> {
  const collection = await getCommentCollection();
  return collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
  });
}

export async function testConnection(): Promise<boolean> {
  try {
    const c = await getClient();
    await c.heartbeat();
    return true;
  } catch (error) {
    console.error("ChromaDB connection test failed:", error);
    return false;
  }
}
