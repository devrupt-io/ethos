"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DiscourseData {
  commentTypeDistribution: { type: string; count: number; avgSentiment: number }[];
  strongArguments: {
    argument: string | null;
    type: string | null;
    sentiment: string | null;
    by: string | null;
    concepts: string[] | null;
  }[];
  totalComments: number;
}

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

const typeDescription: Record<string, string> = {
  technical_insight: "Technical deep-dives and expert knowledge",
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

export default function DiscourseView() {
  const [data, setData] = useState<DiscourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights/discourse")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.totalComments === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">💬</div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Analyzing discourse...</h2>
        <p className="text-gray-500">Comments are being processed. Discourse patterns will appear shortly.</p>
      </div>
    );
  }

  const maxType = data.commentTypeDistribution[0]?.count || 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-200">How HN Discusses</h2>
        <p className="text-sm text-gray-500 mt-1">
          The types of contributions people make and the strength of their arguments ({data.totalComments} comments analyzed)
        </p>
      </div>

      {/* Comment type breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Discussion Patterns</h3>
        <div className="space-y-3">
          {data.commentTypeDistribution.map((t) => (
            <Link key={t.type} href={`/discourse/${encodeURIComponent(t.type)}`} className="block hover:bg-gray-800/50 rounded-lg p-1 -m-1 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">{typeEmoji[t.type] || "💬"}</span>
                <span className="w-40 text-sm text-gray-300 capitalize">
                  {t.type.replace(/_/g, " ")}
                </span>
                <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      t.avgSentiment > 0.1 ? "bg-green-500/40" :
                      t.avgSentiment < -0.1 ? "bg-red-500/40" : "bg-blue-500/30"
                    }`}
                    style={{ width: `${(t.count / maxType) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-gray-500 font-mono">{t.count}</span>
                <span className={`w-12 text-right text-xs font-mono ${
                  t.avgSentiment > 0 ? "text-green-400" : t.avgSentiment < 0 ? "text-red-400" : "text-gray-500"
                }`}>
                  {t.avgSentiment > 0 ? "+" : ""}{t.avgSentiment.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-gray-500 ml-9 mt-0.5">
                {typeDescription[t.type] || ""}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Strong arguments */}
      {data.strongArguments.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">
            💡 Strongest Arguments
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Comments with the highest conviction — where people feel most strongly about what they&apos;re saying
          </p>
          <div className="space-y-4">
            {data.strongArguments.map((a, i) => (
              <div key={i} className="border-l-2 border-gray-700 pl-4">
                <p className="text-sm text-gray-200">{a.argument}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {a.by && <span className="text-xs text-gray-500">— {a.by}</span>}
                  {a.type && (
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                      {typeEmoji[a.type] || ""} {a.type.replace(/_/g, " ")}
                    </span>
                  )}
                  {a.concepts?.map((c) => (
                    <span key={c} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
