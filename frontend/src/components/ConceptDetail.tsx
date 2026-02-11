"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ConceptDetailData {
  concept: string;
  stories: {
    hnId: number;
    title: string;
    url: string | null;
    coreIdea: string | null;
    concepts: string[] | null;
    technologies: string[] | null;
    entities: string[] | null;
    sentiment: string | null;
    sentimentScore: number | null;
    controversyPotential: string | null;
    intellectualDepth: string | null;
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
    entities: string[] | null;
    commentType: string | null;
    sentiment: string | null;
    sentimentScore: number | null;
    time: number;
  }[];
  storyCount: number;
  commentCount: number;
}

const sentimentColor = (score: number | null): string => {
  if (score == null) return "text-gray-500";
  if (score > 0.3) return "text-green-400";
  if (score > 0.1) return "text-green-300";
  if (score < -0.3) return "text-red-400";
  if (score < -0.1) return "text-red-300";
  return "text-gray-400";
};

const typeEmoji: Record<string, string> = {
  technical_insight: "⚙️",
  personal_experience: "👤",
  counterargument: "⚔️",
  question: "❓",
  humor: "😄",
  meta_commentary: "🔄",
  resource_sharing: "📎",
  agreement: "✅",
  criticism: "❌",
  tangent: "↗️",
};

const timeAgo = (unix: number) => {
  const seconds = Math.floor(Date.now() / 1000 - unix);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function ConceptDetail({ name }: { name: string }) {
  const [data, setData] = useState<ConceptDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stories" | "comments">("stories");

  useEffect(() => {
    fetch(`/api/insights/concepts/${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // Auto-select tab with content
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

  if (!data) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-300">Concept not found</h2>
        <Link href="/concepts" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          ← Back to concepts
        </Link>
      </div>
    );
  }

  // Collect all technologies from stories and comments
  const allTechs: Record<string, number> = {};
  const allEntities: Record<string, number> = {};
  for (const s of data.stories) {
    for (const t of s.technologies || []) {
      allTechs[t] = (allTechs[t] || 0) + 1;
    }
    for (const e of s.entities || []) {
      allEntities[e] = (allEntities[e] || 0) + 1;
    }
  }
  for (const c of data.comments) {
    for (const t of c.technologies || []) {
      allTechs[t] = (allTechs[t] || 0) + 1;
    }
    for (const e of c.entities || []) {
      allEntities[e] = (allEntities[e] || 0) + 1;
    }
  }
  const topTechs = Object.entries(allTechs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topEntities = Object.entries(allEntities).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div>
      <div className="mb-6">
        <Link href="/concepts" className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">
          ← All concepts
        </Link>
        <h2 className="text-2xl font-bold text-gray-100 capitalize">{data.concept}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {data.storyCount} {data.storyCount === 1 ? "story" : "stories"} · {data.commentCount} {data.commentCount === 1 ? "comment" : "comments"}
        </p>
      </div>

      {/* Technologies related to this concept */}
      {topTechs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 uppercase font-semibold self-center mr-1">Technologies:</span>
          {topTechs.map(([tech, count]) => (
            <span key={tech} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs border border-purple-800/30">
              {tech} {count > 1 && <span className="text-purple-500">×{count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Entities related to this concept */}
      {topEntities.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 uppercase font-semibold self-center mr-1">Companies & Products:</span>
          {topEntities.map(([entity, count]) => (
            <span key={entity} className="px-2 py-1 bg-teal-900/30 text-teal-300 rounded text-xs border border-teal-800/30">
              {entity} {count > 1 && <span className="text-teal-500">×{count}</span>}
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
            <p className="text-gray-500 text-center py-8">No stories found for this concept.</p>
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
                  {s.coreIdea && (
                    <p className="text-sm text-gray-400 mt-1 italic">{s.coreIdea}</p>
                  )}
                  {s.communityAngle && (
                    <p className="text-xs text-gray-500 mt-1">{s.communityAngle}</p>
                  )}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className={`text-lg font-mono ${sentimentColor(s.sentimentScore)}`}>
                    {s.sentimentScore != null ? (s.sentimentScore > 0 ? "+" : "") + s.sentimentScore.toFixed(1) : "?"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">{s.score} pts · {s.by} · {timeAgo(s.time)}</span>
                {s.controversyPotential && s.controversyPotential !== "low" && (
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    s.controversyPotential === "high" ? "bg-orange-900/30 text-orange-400" : "bg-yellow-900/30 text-yellow-400"
                  }`}>
                    🔥 {s.controversyPotential}
                  </span>
                )}
                {s.intellectualDepth === "deep" && (
                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded text-xs">🧠 deep</span>
                )}
                {(s.technologies || []).map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-indigo-900/30 text-indigo-300 rounded text-xs">{t}</span>
                ))}
                <a
                  href={`https://news.ycombinator.com/item?id=${s.hnId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-gray-400 ml-auto"
                >
                  HN →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-3">
          {data.comments.length === 0 && (
            <p className="text-gray-500 text-center py-8">No comments found for this concept.</p>
          )}
          {data.comments.map((c) => (
            <div key={c.hnId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">{typeEmoji[c.commentType || ""] || "💬"}</span>
                <div className="flex-1 min-w-0">
                  {c.argumentSummary && (
                    <p className="text-sm text-gray-200">{c.argumentSummary}</p>
                  )}
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
                    {(c.technologies || []).map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-indigo-900/30 text-indigo-300 rounded text-xs">{t}</span>
                    ))}
                    <a
                      href={`https://news.ycombinator.com/item?id=${c.hnId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600 hover:text-gray-400 ml-auto"
                    >
                      HN →
                    </a>
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
