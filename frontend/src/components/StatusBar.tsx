"use client";

import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  checks: {
    database: boolean;
    chromadb: boolean;
    data: { storyCount: number; commentCount: number; embeddedStories: number; embeddedComments: number } | null;
    worker: {
      running: boolean;
      lastRunAt: string | null;
      currentlyProcessing: string | null;
      totalProcessed: number;
      totalEmbedded: number;
      lastRunResult: { ingested: number; skipped: number; errors: number; tooOld?: number } | null;
    };
  };
}

export default function StatusBar({ health }: { health: HealthData | null }) {
  if (!health) {
    return (
      <div className="mb-6 p-3 bg-gray-800 rounded-lg text-sm text-gray-400 animate-pulse">
        Connecting to backend...
      </div>
    );
  }

  const { checks } = health;
  const worker = checks.worker;
  const data = checks.data;
  const isHealthy = health.status === "healthy";

  const timeAgo = (iso: string | null) => {
    if (!iso) return "never";
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className={`mb-6 p-3 rounded-lg text-sm border ${
      isHealthy
        ? "bg-gray-800 border-gray-700 text-gray-300"
        : "bg-yellow-900/30 border-yellow-700/50 text-yellow-200"
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2 h-2 rounded-full ${
            worker.currentlyProcessing ? "bg-blue-400 animate-pulse" : isHealthy ? "bg-green-400" : "bg-yellow-400"
          }`} />
          <span className="font-medium">
            {worker.currentlyProcessing
              ? `Processing: ${worker.currentlyProcessing.slice(0, 50)}...`
              : isHealthy
                ? "Background worker active"
                : "Starting up..."}
          </span>
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          {data && (
            <>
              <span>{data.embeddedStories} stories analyzed</span>
              <span>{data.embeddedComments} comments analyzed</span>
            </>
          )}
          {worker.lastRunAt && <span>Last run: {timeAgo(worker.lastRunAt)}</span>}
          {worker.lastRunResult && (
            <span>
              +{worker.lastRunResult.ingested} new / {worker.lastRunResult.skipped} cached
              {worker.lastRunResult.tooOld ? ` / ${worker.lastRunResult.tooOld} old` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
