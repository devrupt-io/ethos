"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Entity {
  name: string;
  count: number;
  storyCount: number;
  commentCount: number;
  avgSentiment: number;
  recentStories: { title: string; hnId: number; time: number }[];
}

const sentimentColor = (score: number): string => {
  if (score > 0.3) return "text-green-400";
  if (score > 0.1) return "text-green-300";
  if (score < -0.3) return "text-red-400";
  if (score < -0.1) return "text-red-300";
  return "text-gray-400";
};

const sentimentLabel = (score: number): string => {
  if (score > 0.3) return "Very Positive";
  if (score > 0.1) return "Positive";
  if (score < -0.3) return "Very Negative";
  if (score < -0.1) return "Negative";
  return "Neutral";
};

const sentimentBg = (score: number): string => {
  if (score > 0.3) return "bg-green-500/10 border-green-500/20";
  if (score > 0.1) return "bg-green-500/5 border-green-500/10";
  if (score < -0.3) return "bg-red-500/10 border-red-500/20";
  if (score < -0.1) return "bg-red-500/5 border-red-500/10";
  return "bg-gray-800/50 border-gray-700";
};

type SortType = "sentiment-positive" | "sentiment-negative" | "recent" | "alphabetical";

export default function EntityExplorer() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetch("/api/insights/entities")
      .then((r) => r.json())
      .then((d) => setEntities(d.entities || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRecentDate = (entity: Entity): number => {
    const storyDates = entity.recentStories.map((s) => s.time * 1000);
    return storyDates.length > 0 ? Math.max(...storyDates) : 0;
  };

  const sortedAndFilteredEntities = (() => {
    let result = entities.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortType === "sentiment-positive") {
      result.sort((a, b) => b.avgSentiment - a.avgSentiment);
    } else if (sortType === "sentiment-negative") {
      result.sort((a, b) => a.avgSentiment - b.avgSentiment);
    } else if (sortType === "recent") {
      result.sort((a, b) => getRecentDate(b) - getRecentDate(a));
    } else if (sortType === "alphabetical") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  })();

  const totalPages = Math.ceil(sortedAndFilteredEntities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntities = sortedAndFilteredEntities.slice(startIndex, startIndex + itemsPerPage);

  const maxCount = sortedAndFilteredEntities[0]?.count || 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-200">
          Companies, Products & Projects
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Brands, services, and open-source projects being discussed on HN — with community sentiment
        </p>
      </div>

      {/* Search and sort controls */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSortType("alphabetical")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              sortType === "alphabetical"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Alphabetical
          </button>
          <button
            onClick={() => setSortType("sentiment-positive")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              sortType === "sentiment-positive"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Most Positive
          </button>
          <button
            onClick={() => setSortType("sentiment-negative")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              sortType === "sentiment-negative"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Most Negative
          </button>
          <button
            onClick={() => setSortType("recent")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              sortType === "recent"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Most Recent
          </button>
        </div>
      </div>

      {/* Entity list */}
      <div className="space-y-2">
        {paginatedEntities.map((e) => (
          <Link
            key={e.name}
            href={`/entities/${encodeURIComponent(e.name)}`}
            className={`block p-4 rounded-lg border transition-colors hover:bg-gray-800/70 ${sentimentBg(e.avgSentiment)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-100">{e.name}</span>
                <span className="text-xs text-gray-500">
                  {e.storyCount} {e.storyCount === 1 ? "story" : "stories"} · {e.commentCount} {e.commentCount === 1 ? "comment" : "comments"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${sentimentColor(e.avgSentiment)}`}>
                  {sentimentLabel(e.avgSentiment)}
                </span>
                <span className={`font-mono text-sm ${sentimentColor(e.avgSentiment)}`}>
                  {e.avgSentiment > 0 ? "+" : ""}{e.avgSentiment.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Frequency bar */}
            <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${e.avgSentiment > 0 ? "bg-green-500" : e.avgSentiment < 0 ? "bg-red-500" : "bg-gray-500"}`}
                style={{ width: `${(e.count / maxCount) * 100}%` }}
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
