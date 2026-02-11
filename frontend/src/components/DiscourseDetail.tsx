"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DiscourseComment {
  hnId: number;
  storyHnId: number;
  by: string | null;
  storyTitle: string | null;
  argumentSummary: string | null;
  concepts: string[] | null;
  technologies: string[] | null;
  entities: string[] | null;
  sentiment: string | null;
  sentimentScore: number | null;
  time: number;
}

interface DiscourseDetailData {
  type: string;
  comments: DiscourseComment[];
  totalComments: number;
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

const sentimentLabelMap: Record<string, string> = {
  very_positive: "Very Positive", positive: "Positive", neutral: "Neutral",
  mixed: "Mixed", negative: "Negative", very_negative: "Very Negative",
};

const typeEmoji: Record<string, string> = {
  technical_insight: "⚙️", personal_experience: "👤", counterargument: "⚔️",
  question: "❓", humor: "😄", meta_commentary: "🔄",
  resource_sharing: "📎", agreement: "✅", criticism: "❌", tangent: "↗️",
};

const typeDescription: Record<string, string> = {
  technical_insight: "Technical deep-dives and expert knowledge sharing",
  personal_experience: "First-hand accounts and lived experience",
  counterargument: "Pushing back on claims and assumptions",
  question: "Seeking clarification or challenging ideas",
  humor: "Wit and levity in technical discourse",
  meta_commentary: "Comments about the discussion itself",
  resource_sharing: "Links, papers, and references",
  agreement: "Reinforcing and building on points",
  criticism: "Identifying flaws and weaknesses",
  tangent: "Interesting diversions from the main topic",
};

const timeAgo = (unix: number) => {
  const seconds = Math.floor(Date.now() / 1000 - unix);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function DiscourseDetail({ type }: { type: string }) {
  const [data, setData] = useState<DiscourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/insights/discourse/${encodeURIComponent(type)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.totalComments === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-300">No comments found</h2>
        <Link href="/discourse" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          ← Back to discourse
        </Link>
      </div>
    );
  }

  const displayType = type.replace(/_/g, " ");
  const sentimentOrder = ["very_positive", "positive", "mixed", "neutral", "negative", "very_negative"];
  const sentimentEntries = sentimentOrder
    .filter((s) => data.sentimentBreakdown[s])
    .map((s) => ({ key: s, count: data.sentimentBreakdown[s] }));
  const maxSentimentCount = Math.max(...sentimentEntries.map((e) => e.count), 1);

  return (
    <div>
      <div className="mb-6">
        <Link href="/discourse" className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">
          ← All discourse types
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{typeEmoji[type] || "💬"}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-100 capitalize">{displayType}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{typeDescription[type] || ""}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">{data.totalComments} comments</p>
      </div>

      {/* Sentiment breakdown */}
      {sentimentEntries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Sentiment Distribution</h3>
          <div className="space-y-2">
            {sentimentEntries.map((e) => (
              <div key={e.key} className="flex items-center gap-3">
                <span className="w-5 text-center text-sm">{sentimentEmoji[e.key] || "⬜"}</span>
                <span className="w-28 text-sm text-gray-400">{sentimentLabelMap[e.key] || e.key}</span>
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

      {/* Comments */}
      <div className="space-y-3">
        {data.comments.map((c) => (
          <div key={c.hnId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            {c.storyTitle && (
              <div className="mb-2">
                <a
                  href={`https://news.ycombinator.com/item?id=${c.storyHnId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  on: {c.storyTitle}
                </a>
              </div>
            )}
            {c.argumentSummary && <p className="text-sm text-gray-200">{c.argumentSummary}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {c.by && <span className="text-xs text-gray-500">— {c.by}</span>}
              <span className="text-xs text-gray-600">{timeAgo(c.time)}</span>
              <span className={`text-xs font-mono ${sentimentColor(c.sentimentScore)}`}>
                {c.sentimentScore != null ? (c.sentimentScore > 0 ? "+" : "") + c.sentimentScore.toFixed(1) : ""}
              </span>
              {(c.concepts || []).slice(0, 3).map((cp) => (
                <Link key={cp} href={`/concepts/${encodeURIComponent(cp)}`} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs hover:bg-blue-900/50">{cp}</Link>
              ))}
              {(c.entities || []).slice(0, 3).map((e) => (
                <Link key={e} href={`/entities/${encodeURIComponent(e)}`} className="px-2 py-0.5 bg-teal-900/30 text-teal-400 rounded text-xs hover:bg-teal-900/50">{e}</Link>
              ))}
              {(c.technologies || []).slice(0, 3).map((t) => (
                <span key={t} className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">{t}</span>
              ))}
              <a href={`https://news.ycombinator.com/item?id=${c.hnId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-400 ml-auto">HN →</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
