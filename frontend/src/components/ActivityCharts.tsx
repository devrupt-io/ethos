"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface TimelinePoint {
  hour: string;
  stories: number;
  comments: number;
  avgSentiment: number;
  sentimentBreakdown: Record<string, number>;
  controversyBreakdown: Record<string, number>;
  depthBreakdown: Record<string, number>;
  commentTypes: Record<string, number>;
  topConcepts: { name: string; count: number }[];
}

interface SentimentData {
  sentimentDistribution: Record<string, number>;
  controversyDistribution: Record<string, number>;
  depthDistribution: Record<string, number>;
  totalAnalyzed: number;
}

interface DiscourseData {
  commentTypeDistribution: { type: string; count: number; avgSentiment: number }[];
  totalComments: number;
}

const SENTIMENT_COLORS: Record<string, string> = {
  very_positive: "#22c55e",
  positive: "#4ade80",
  mixed: "#facc15",
  neutral: "#9ca3af",
  negative: "#f87171",
  very_negative: "#ef4444",
};

const CONTROVERSY_COLORS: Record<string, string> = {
  low: "#6b7280",
  medium: "#facc15",
  high: "#f97316",
};

const DEPTH_COLORS: Record<string, string> = {
  surface: "#6b7280",
  moderate: "#3b82f6",
  deep: "#a855f7",
};

const TYPE_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7",
  "#ec4899", "#14b8a6", "#eab308", "#ef4444",
  "#6366f1", "#84cc16",
];

const formatHour = (hour: string) => {
  const d = new Date(hour + ":00Z");
  return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || entry.fill }}>
          {entry.name}: {typeof entry.value === "number" ? (Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(2)) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function ActivityCharts() {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [discourseData, setDiscourseData] = useState<DiscourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/insights/timeline").then((r) => r.json()),
      fetch("/api/insights/sentiment").then((r) => r.json()),
      fetch("/api/insights/discourse").then((r) => r.json()),
    ])
      .then(([tl, sent, disc]) => {
        setTimeline(tl.timeline || []);
        setSentimentData(sent);
        setDiscourseData(disc);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const hasTimeline = timeline.length > 0;
  const hasSentiment = sentimentData && sentimentData.totalAnalyzed > 0;
  const hasDiscourse = discourseData && discourseData.totalComments > 0;

  if (!hasTimeline && !hasSentiment && !hasDiscourse) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📈</div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Collecting data...</h2>
        <p className="text-gray-500">Charts will appear once stories and comments are analyzed.</p>
      </div>
    );
  }

  // Prepare sentiment pie data
  const sentimentPieData = hasSentiment
    ? Object.entries(sentimentData.sentimentDistribution).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
        fill: SENTIMENT_COLORS[name] || "#6b7280",
      }))
    : [];

  // Prepare controversy pie data
  const controversyPieData = hasSentiment
    ? Object.entries(sentimentData.controversyDistribution).map(([name, value]) => ({
        name,
        value,
        fill: CONTROVERSY_COLORS[name] || "#6b7280",
      }))
    : [];

  // Prepare depth pie data
  const depthPieData = hasSentiment
    ? Object.entries(sentimentData.depthDistribution).map(([name, value]) => ({
        name,
        value,
        fill: DEPTH_COLORS[name] || "#6b7280",
      }))
    : [];

  // Prepare comment type bar data
  const commentTypeData = hasDiscourse
    ? discourseData.commentTypeDistribution.map((t) => ({
        type: t.type.replace(/_/g, " "),
        count: t.count,
        sentiment: +t.avgSentiment.toFixed(2),
      }))
    : [];

  // Format timeline for display
  const timelineFormatted = timeline.map((t) => ({
    ...t,
    label: formatHour(t.hour),
  }));

  return (
    <div className="space-y-6">
      {/* Activity over time — dual Y-axes for stories (left) and comments (right) */}
      {hasTimeline && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">📈 Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timelineFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "#3b82f6", fontSize: 11 }} label={{ value: "Stories", angle: -90, position: "insideLeft", fill: "#3b82f6", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#22c55e", fontSize: 11 }} label={{ value: "Comments", angle: 90, position: "insideRight", fill: "#22c55e", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="stories" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name="Stories" />
              <Area yAxisId="right" type="monotone" dataKey="comments" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Comments" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sentiment trend */}
      {hasTimeline && timeline.some((t) => t.avgSentiment !== 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">🌡️ Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timelineFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={[-1, 1]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="avgSentiment"
                stroke="#facc15"
                strokeWidth={2}
                dot={{ fill: "#facc15", r: 3 }}
                name="Avg Sentiment"
              />
              {/* Zero line */}
              <Line
                type="monotone"
                dataKey={() => 0}
                stroke="#4b5563"
                strokeDasharray="5 5"
                dot={false}
                name=""
                legendType="none"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sentiment distribution pie */}
        {sentimentPieData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Sentiment Split</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sentimentPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {sentimentPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                  formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Controversy pie */}
        {controversyPieData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">🔥 Controversy</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={controversyPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {controversyPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                  formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Depth pie */}
        {depthPieData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">🧠 Depth</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={depthPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {depthPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                  formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Comment type breakdown bar chart */}
      {commentTypeData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">💬 Discourse Breakdown</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, commentTypeData.length * 32)}>
            <BarChart data={commentTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                {commentTypeData.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
