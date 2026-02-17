"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Concept {
  name: string;
  count: number;
  storyCount: number;
  commentCount: number;
  avgSentiment: number;
  recentStories: { title: string; hnId: number; coreIdea: string | null; time: number }[];
  recentComments: { argumentSummary: string | null; by: string | null; commentType: string | null; hnId: number; storyHnId: number; time: number }[];
  topCommentTypes: { type: string; count: number }[];
  technologies: string[];
}

const sentimentColor = (score: number): string => {
  if (score > 0.3) return "text-green-400";
  if (score > 0.1) return "text-green-300";
  if (score < -0.3) return "text-red-400";
  if (score < -0.1) return "text-red-300";
  return "text-gray-400";
};

const sentimentBg = (score: number): string => {
  if (score > 0.3) return "bg-green-500/20 border-green-500/30";
  if (score > 0.1) return "bg-green-500/10 border-green-500/20";
  if (score < -0.3) return "bg-red-500/20 border-red-500/30";
  if (score < -0.1) return "bg-red-500/10 border-red-500/20";
  return "bg-gray-800 border-gray-700";
};

type SortType = "sentiment-positive" | "sentiment-negative" | "recent" | "alphabetical";

export default function ConceptExplorer() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("recent");

  useEffect(() => {
    fetch("/api/insights/concepts")
      .then((r) => r.json())
      .then((d) => setConcepts(d.concepts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRecentDate = (concept: Concept): number => {
    const storyDates = concept.recentStories.map((s) => s.time * 1000);
    const commentDates = concept.recentComments.map((c) => c.time * 1000);
    const allDates = [...storyDates, ...commentDates];
    return allDates.length > 0 ? Math.max(...allDates) : 0;
  };

  const sortedAndFilteredConcepts = (() => {
    let result = concepts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🧠</div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">
          Building concept map...
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          The background worker is ingesting and analyzing Hacker News stories.
          Concepts will appear here as they&apos;re extracted. This usually takes a
          few minutes on first run.
        </p>
      </div>
    );
  }

  const maxCount = sortedAndFilteredConcepts[0]?.count || 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-200">
          What HN is thinking about
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Concepts extracted from stories and comments
        </p>
      </div>

      {/* Search and sort controls */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Search concepts..."
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

      {/* Expanded concept detail */}
      {expanded && (() => {
        const c = concepts.find((x) => x.name === expanded);
        if (!c) return null;
        return (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{c.name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Mentioned {c.count} times ({c.storyCount} stories, {c.commentCount} comments)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-right ${sentimentColor(c.avgSentiment)}`}>
                  <div className="text-2xl font-mono">{c.avgSentiment > 0 ? "+" : ""}{c.avgSentiment.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">avg sentiment</div>
                </div>
                <Link
                  href={`/concepts/${encodeURIComponent(c.name)}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                >
                  View all →
                </Link>
              </div>
            </div>

            {c.technologies && c.technologies.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {c.technologies.map((t) => (
                    <span key={t} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs border border-purple-800/30">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {c.recentStories.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Related stories</h4>
                {c.recentStories.map((s) => (
                  <div key={s.hnId} className="mb-2">
                    <a
                      href={`https://news.ycombinator.com/item?id=${s.hnId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      {s.title}
                    </a>
                    {s.coreIdea && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">{s.coreIdea}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {c.recentComments && c.recentComments.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Related comments</h4>
                {c.recentComments.map((cm, i) => (
                  <div key={i} className="mb-2 border-l-2 border-gray-700 pl-3">
                    <p className="text-sm text-gray-300">{cm.argumentSummary}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {cm.by && `— ${cm.by}`}
                        {cm.commentType && ` · ${cm.commentType.replace(/_/g, " ")}`}
                      </span>
                      <a
                        href={`https://news.ycombinator.com/item?id=${cm.hnId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-600 hover:text-gray-400"
                      >
                        HN →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {c.topCommentTypes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">How people engage</h4>
                <div className="flex gap-2">
                  {c.topCommentTypes.map((t) => (
                    <span key={t.type} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                      {t.type.replace(/_/g, " ")} ({t.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Full concept list */}
      <div className="space-y-2">
        {sortedAndFilteredConcepts.map((c) => (
          <Link
            key={c.name}
            href={`/concepts/${encodeURIComponent(c.name)}`}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-gray-800/50 bg-gray-900 border-gray-800`}
          >
            <div className="flex items-center gap-3">
              <div className="w-20">
                <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.avgSentiment > 0 ? "bg-green-500" : c.avgSentiment < 0 ? "bg-red-500" : "bg-gray-500"}`}
                    style={{ width: `${(c.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
              <span className="font-medium text-gray-200">{c.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{c.storyCount}s / {c.commentCount}c</span>
              <span className={sentimentColor(c.avgSentiment)}>
                {c.avgSentiment > 0 ? "+" : ""}{c.avgSentiment.toFixed(2)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
