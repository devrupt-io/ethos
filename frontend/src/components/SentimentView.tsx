"use client";

import { useState, useEffect } from "react";

interface SentimentData {
  sentimentDistribution: Record<string, number>;
  controversyDistribution: Record<string, number>;
  depthDistribution: Record<string, number>;
  controversial: { title: string; hnId: number; coreIdea: string | null; sentiment: string; score: number }[];
  deepDives: { title: string; hnId: number; coreIdea: string | null; sentiment: string; score: number }[];
  totalAnalyzed: number;
  range: string;
}

const sentimentEmoji: Record<string, string> = {
  very_positive: "🟢",
  positive: "🟩",
  neutral: "⬜",
  mixed: "🟨",
  negative: "🟥",
  very_negative: "🔴",
};

const sentimentLabel: Record<string, string> = {
  very_positive: "Very Positive",
  positive: "Positive",
  neutral: "Neutral",
  mixed: "Mixed",
  negative: "Negative",
  very_negative: "Very Negative",
};

export default function SentimentView() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24h");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/insights/sentiment?range=${range}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.totalAnalyzed === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Analyzing sentiment...</h2>
        <p className="text-gray-500">Stories are being processed. Sentiment data will appear shortly.</p>
      </div>
    );
  }

  const maxSentiment = Math.max(...Object.values(data.sentimentDistribution), 1);

  const rangeLabels: Record<string, string> = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days", "all": "All time" };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Community Sentiment</h2>
          <p className="text-sm text-gray-500 mt-1">
            How the HN community feels · {data.totalAnalyzed} stories · {rangeLabels[range] || range}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {["24h", "7d", "30d", "all"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === r ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment distribution bars */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Emotional Temperature</h3>
        <div className="space-y-3">
          {Object.entries(data.sentimentDistribution)
            .sort((a, b) => {
              const order = ["very_positive", "positive", "mixed", "neutral", "negative", "very_negative"];
              return order.indexOf(a[0]) - order.indexOf(b[0]);
            })
            .map(([sentiment, count]) => (
              <div key={sentiment} className="flex items-center gap-3">
                <span className="w-6 text-center">{sentimentEmoji[sentiment] || "⬜"}</span>
                <span className="w-28 text-sm text-gray-400">{sentimentLabel[sentiment] || sentiment}</span>
                <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${
                      sentiment.includes("positive") ? "bg-green-500/60" :
                      sentiment.includes("negative") ? "bg-red-500/60" :
                      sentiment === "mixed" ? "bg-yellow-500/60" : "bg-gray-600"
                    }`}
                    style={{ width: `${(count / maxSentiment) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-gray-500 font-mono">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Controversy meter */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">🔥 Controversy Level</h3>
          <div className="space-y-2">
            {["low", "medium", "high"].map((level) => (
              <div key={level} className="flex items-center gap-3">
                <span className="w-16 text-sm text-gray-400 capitalize">{level}</span>
                <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      level === "high" ? "bg-orange-500/60" :
                      level === "medium" ? "bg-yellow-500/40" : "bg-gray-600"
                    }`}
                    style={{ width: `${((data.controversyDistribution[level] || 0) / data.totalAnalyzed) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-gray-500 font-mono">
                  {data.controversyDistribution[level] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Intellectual depth */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">🧠 Intellectual Depth</h3>
          <div className="space-y-2">
            {["surface", "moderate", "deep"].map((level) => (
              <div key={level} className="flex items-center gap-3">
                <span className="w-16 text-sm text-gray-400 capitalize">{level}</span>
                <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      level === "deep" ? "bg-purple-500/60" :
                      level === "moderate" ? "bg-blue-500/40" : "bg-gray-600"
                    }`}
                    style={{ width: `${((data.depthDistribution[level] || 0) / data.totalAnalyzed) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-gray-500 font-mono">
                  {data.depthDistribution[level] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most controversial */}
        {data.controversial.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">🔥 Most Controversial</h3>
            <div className="space-y-3">
              {data.controversial.map((s) => (
                <div key={s.hnId}>
                  <a
                    href={`https://news.ycombinator.com/item?id=${s.hnId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {s.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">{s.score} pts</span>
                    {s.coreIdea && <p className="text-xs text-gray-500 italic">{s.coreIdea}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deep dives */}
        {data.deepDives.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">🧠 Deep Dives</h3>
            <div className="space-y-3">
              {data.deepDives.map((s) => (
                <div key={s.hnId}>
                  <a
                    href={`https://news.ycombinator.com/item?id=${s.hnId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {s.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">{s.score} pts</span>
                    {s.coreIdea && <p className="text-xs text-gray-500 italic">{s.coreIdea}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
