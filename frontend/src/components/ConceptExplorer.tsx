"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Concept {
  name: string;
  count: number;
  storyCount: number;
  commentCount: number;
  avgSentiment: number;
  recentStories: { title: string; hnId: number; coreIdea: string | null }[];
  recentComments: { argumentSummary: string | null; by: string | null; commentType: string | null; hnId: number; storyHnId: number }[];
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

export default function ConceptExplorer() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights/concepts")
      .then((r) => r.json())
      .then((d) => setConcepts(d.concepts || []))
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

  const maxCount = concepts[0]?.count || 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-200">
          What HN is thinking about
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Concepts extracted from stories and comments, sized by frequency,
          colored by sentiment
        </p>
      </div>

      {/* Concept cloud */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {concepts.slice(0, 30).map((c) => {
          const size = Math.max(0.7, Math.min(1.8, (c.count / maxCount) * 1.8));
          return (
            <button
              key={c.name}
              onClick={() => setExpanded(expanded === c.name ? null : c.name)}
              className={`px-3 py-1.5 rounded-full border transition-all hover:scale-105 leading-tight ${sentimentBg(c.avgSentiment)} ${
                expanded === c.name ? "ring-2 ring-blue-400" : ""
              }`}
              style={{ fontSize: `${size}rem` }}
            >
              <span className={sentimentColor(c.avgSentiment)}>{c.name}</span>
              <span className="text-gray-500 ml-1 text-xs">{c.count}</span>
            </button>
          );
        })}
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
        {concepts.map((c) => (
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
