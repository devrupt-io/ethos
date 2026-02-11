"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Entity {
  name: string;
  count: number;
  storyCount: number;
  commentCount: number;
  avgSentiment: number;
  recentStories: { title: string; hnId: number }[];
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

export default function EntityExplorer() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights/entities")
      .then((r) => r.json())
      .then((d) => setEntities(d.entities || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🏢</div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">
          Discovering entities...
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Companies, products, services, and open-source projects will appear
          here as the background worker analyzes Hacker News discussions.
        </p>
      </div>
    );
  }

  const maxCount = entities[0]?.count || 1;

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

      {/* Entity cloud */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {entities.slice(0, 30).map((e) => {
          const size = Math.max(0.75, Math.min(1.6, (e.count / maxCount) * 1.6));
          return (
            <Link
              key={e.name}
              href={`/entities/${encodeURIComponent(e.name)}`}
              className={`px-3 py-1.5 rounded-full border leading-tight hover:scale-105 transition-all ${sentimentBg(e.avgSentiment)}`}
              style={{ fontSize: `${size}rem` }}
            >
              <span className={sentimentColor(e.avgSentiment)}>{e.name}</span>
              <span className="text-gray-500 ml-1 text-xs">{e.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Entity list */}
      <div className="space-y-2">
        {entities.map((e) => (
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
    </div>
  );
}
