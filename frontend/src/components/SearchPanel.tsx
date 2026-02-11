"use client";

import { useState } from "react";

interface SearchResult {
  hnId: number;
  title?: string;
  coreIdea?: string;
  communityAngle?: string;
  argumentSummary?: string;
  concepts?: string[] | null;
  sentiment?: string | null;
  sentimentScore?: number | null;
  controversyPotential?: string;
  intellectualDepth?: string;
  commentType?: string;
  by: string;
  time: number;
  score?: number;
  similarity: number | null;
}

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"stories" | "comments">("stories");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), type, limit: 20 }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-200">Explore Ideas</h2>
        <p className="text-sm text-gray-500 mt-1">
          Search by concept, not keywords. Try &quot;fear of AI replacing jobs&quot; or &quot;open source sustainability&quot;
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe an idea or concept..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                       text-sm text-gray-200 placeholder-gray-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "stories" | "comments")}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300"
          >
            <option value="stories">Stories</option>
            <option value="comments">Comments</option>
          </select>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                       hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={r.hnId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {r.title ? (
                    <a
                      href={`https://news.ycombinator.com/item?id=${r.hnId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-200 hover:text-blue-400 transition-colors"
                    >
                      {r.title}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-300">{r.argumentSummary}</p>
                  )}

                  {r.coreIdea && (
                    <p className="text-sm text-gray-400 mt-1 italic">{r.coreIdea}</p>
                  )}
                  {r.communityAngle && (
                    <p className="text-xs text-gray-500 mt-1">{r.communityAngle}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.similarity != null && (
                      <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full text-xs font-mono">
                        {(r.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                    {r.sentiment && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        r.sentiment.includes("positive") ? "bg-green-900/30 text-green-400" :
                        r.sentiment.includes("negative") ? "bg-red-900/30 text-red-400" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {r.sentiment.replace(/_/g, " ")}
                      </span>
                    )}
                    {r.controversyPotential === "high" && (
                      <span className="px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded-full text-xs">🔥 controversial</span>
                    )}
                    {r.intellectualDepth === "deep" && (
                      <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded-full text-xs">🧠 deep</span>
                    )}
                    {r.commentType && (
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full text-xs">
                        {r.commentType.replace(/_/g, " ")}
                      </span>
                    )}
                    {r.concepts?.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full text-xs">{c}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <span>by {r.by}</span>
                    {r.score != null && <span>• {r.score} pts</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-mono">#{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-12 text-gray-500">
          <p>No matching concepts found.</p>
          <p className="text-sm mt-1">
            The background worker may still be processing stories. Try again in a few minutes.
          </p>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-400">Search by ideas, not keywords</p>
          <p className="text-sm mt-1">
            Vector embeddings find semantically similar concepts across all analyzed content
          </p>
        </div>
      )}
    </div>
  );
}
