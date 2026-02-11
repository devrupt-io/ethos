"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EntityDetailData {
  entity: string;
  stories: {
    hnId: number;
    title: string;
    url: string | null;
    coreIdea: string | null;
    concepts: string[] | null;
    technologies: string[] | null;
    sentiment: string | null;
    sentimentScore: number | null;
    communityAngle: string | null;
    time: number;
    score: number;
    by: string;
  }[];
  comments: {
    hnId: number;
    storyHnId: number;
    by: string | null;
    argumentSummary: string | null;
    concepts: string[] | null;
    technologies: string[] | null;
    commentType: string | null;
    sentiment: string | null;
    sentimentScore: number | null;
    time: number;
  }[];
  storyCount: number;
  commentCount: number;
  sentimentBreakdown: Record<string, number>;
}

const sentimentColor = (score: number | null): string => {
  if (score == null) return "text-gray-500";
  if (score > 0.3) return "text-green-400";
  if (score > 0.1) return "text-green-300";
  if (score < -0.3) return "text-red-400";
  if (score < -0.1) return "text-red-300";
  return "text-gray-400";
};

const sentimentEmoji: Record<string, string> = {
  very_positive: "🟢", positive: "🟩", neutral: "⬜",
  mixed: "🟨", negative: "🟥", very_negative: "🔴",
};

const sentimentLabel: Record<string, string> = {
  very_positive: "Very Positive", positive: "Positive", neutral: "Neutral",
  mixed: "Mixed", negative: "Negative", very_negative: "Very Negative",
};

const typeEmoji: Record<string, string> = {
  technical_insight: "⚙️", personal_experience: "👤", counterargument: "⚔️",
  question: "❓", humor: "😄", meta_commentary: "🔄",
  resource_sharing: "📎", agreement: "✅", criticism: "❌", tangent: "↗️",
};

const timeAgo = (unix: number) => {
  const seconds = Math.floor(Date.now() / 1000 - unix);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function EntityDetail({ name }: { name: string }) {
  const [data, setData] = useState<EntityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stories" | "comments">("stories");

  useEffect(() => {
    fetch(`/api/insights/entities/${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d && d.storyCount === 0 && d.commentCount > 0) {
          setTab("comments");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || (data.storyCount === 0 && data.commentCount === 0)) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-300">Entity not found</h2>
        <Link href="/entities" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          ← Back to entities
        </Link>
      </div>
    );
  }

  // Aggregate technologies and concepts
  const allTechs: Record<string, number> = {};
  const allConcepts: Record<string, number> = {};
  for (const s of data.stories) {
    for (const t of s.technologies || []) allTechs[t] = (allTechs[t] || 0) + 1;
    for (const c of s.concepts || []) allConcepts[c] = (allConcepts[c] || 0) + 1;
  }
  for (const c of data.comments) {
    for (const t of c.technologies || []) allTechs[t] = (allTechs[t] || 0) + 1;
    for (const cp of c.concepts || []) allConcepts[cp] = (allConcepts[cp] || 0) + 1;
  }
  const topTechs = Object.entries(allTechs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topConcepts = Object.entries(allConcepts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const sentimentOrder = ["very_positive", "positive", "mixed", "neutral", "negative", "very_negative"];
  const sentimentEntries = sentimentOrder
    .filter((s) => data.sentimentBreakdown[s])
    .map((s) => ({ key: s, count: data.sentimentBreakdown[s] }));
  const maxSentimentCount = Math.max(...sentimentEntries.map((e) => e.count), 1);

  return (
    <div>
      <div className="mb-6">
        <Link href="/entities" className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">
          ← All entities
        </Link>
        <h2 className="text-2xl font-bold text-gray-100">{name}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {data.storyCount} {data.storyCount === 1 ? "story" : "stories"} · {data.commentCount} {data.commentCount === 1 ? "comment" : "comments"}
        </p>
      </div>

      {/* Sentiment breakdown */}
      {sentimentEntries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Community Sentiment</h3>
          <div className="space-y-2">
            {sentimentEntries.map((e) => (
              <div key={e.key} className="flex items-center gap-3">
                <span className="w-5 text-center text-sm">{sentimentEmoji[e.key] || "⬜"}</span>
                <span className="w-28 text-sm text-gray-400">{sentimentLabel[e.key] || e.key}</span>
                <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      e.key.includes("positive") ? "bg-green-500/60" :
                      e.key.includes("negative") ? "bg-red-500/60" :
                      e.key === "mixed" ? "bg-yellow-500/60" : "bg-gray-600"
                    }`}
                    style={{ width: `${(e.count / maxSentimentCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-gray-500 font-mono">{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related concepts */}
      {topConcepts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 uppercase font-semibold self-center mr-1">Concepts:</span>
          {topConcepts.map(([concept, count]) => (
            <Link
              key={concept}
              href={`/concepts/${encodeURIComponent(concept)}`}
              className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs border border-blue-800/30 hover:bg-blue-900/50"
            >
              {concept} {count > 1 && <span className="text-blue-500">×{count}</span>}
            </Link>
          ))}
        </div>
      )}

      {/* Related technologies */}
      {topTechs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 uppercase font-semibold self-center mr-1">Technologies:</span>
          {topTechs.map(([tech, count]) => (
            <span key={tech} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs border border-purple-800/30">
              {tech} {count > 1 && <span className="text-purple-500">×{count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab("stories")}
          className={`px-4 py-2 rounded-t text-sm font-medium ${
            tab === "stories" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Stories ({data.storyCount})
        </button>
        <button
          onClick={() => setTab("comments")}
          className={`px-4 py-2 rounded-t text-sm font-medium ${
            tab === "comments" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Comments ({data.commentCount})
        </button>
      </div>

      {tab === "stories" && (
        <div className="space-y-4">
          {data.stories.length === 0 && (
            <p className="text-gray-500 text-center py-8">No stories found for this entity.</p>
          )}
          {data.stories.map((s) => (
            <div key={s.hnId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <a
                    href={s.url || `https://news.ycombinator.com/item?id=${s.hnId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {s.title}
                  </a>
                  {s.coreIdea && <p className="text-sm text-gray-400 mt-1 italic">{s.coreIdea}</p>}
                  {s.communityAngle && <p className="text-xs text-gray-500 mt-1">{s.communityAngle}</p>}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className={`text-lg font-mono ${sentimentColor(s.sentimentScore)}`}>
                    {s.sentimentScore != null ? (s.sentimentScore > 0 ? "+" : "") + s.sentimentScore.toFixed(1) : "?"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">{s.score} pts · {s.by} · {timeAgo(s.time)}</span>
                {(s.concepts || []).slice(0, 3).map((c) => (
                  <Link key={c} href={`/concepts/${encodeURIComponent(c)}`} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs hover:bg-blue-900/50">{c}</Link>
                ))}
                <a href={`https://news.ycombinator.com/item?id=${s.hnId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-400 ml-auto">HN →</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-3">
          {data.comments.length === 0 && (
            <p className="text-gray-500 text-center py-8">No comments found for this entity.</p>
          )}
          {data.comments.map((c) => (
            <div key={c.hnId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">{typeEmoji[c.commentType || ""] || "💬"}</span>
                <div className="flex-1 min-w-0">
                  {c.argumentSummary && <p className="text-sm text-gray-200">{c.argumentSummary}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {c.by && <span className="text-xs text-gray-500">— {c.by}</span>}
                    <span className="text-xs text-gray-600">{timeAgo(c.time)}</span>
                    {c.commentType && (
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                        {c.commentType.replace(/_/g, " ")}
                      </span>
                    )}
                    <span className={`text-xs font-mono ${sentimentColor(c.sentimentScore)}`}>
                      {c.sentimentScore != null ? (c.sentimentScore > 0 ? "+" : "") + c.sentimentScore.toFixed(1) : ""}
                    </span>
                    {(c.concepts || []).slice(0, 3).map((cp) => (
                      <Link key={cp} href={`/concepts/${encodeURIComponent(cp)}`} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs hover:bg-blue-900/50">{cp}</Link>
                    ))}
                    <a href={`https://news.ycombinator.com/item?id=${c.hnId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-400 ml-auto">HN →</a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
