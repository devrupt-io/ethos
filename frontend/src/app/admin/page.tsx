"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminStatus {
  health: {
    database: boolean;
    chromadb: boolean;
  };
  data: {
    storyCount: number;
    commentCount: number;
    embeddedStories: number;
    embeddedComments: number;
    pendingStories: number;
    pendingComments: number;
  };
  worker: {
    running: boolean;
    currentlyProcessing: string | null;
    lastRunAt: string | null;
    lastRunResult: { ingested: number; skipped: number; tooOld: number; errors: number } | null;
    totalProcessed: number;
    totalEmbedded: number;
    recentErrors: string[];
    avgTimePerStory: number | null;
    cycleStartedAt: string | null;
    cycleTotal: number;
    cycleCurrent: number;
    cyclePhase: string | null;
  };
  analysis: {
    currentVersion: string;
    storyVersions: Record<string, number>;
    commentVersions: Record<string, number>;
    storiesNeedingUpdate: number;
    commentsNeedingUpdate: number;
  };
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseInt(num, 10) : num;
  if (isNaN(n)) return String(num);
  return n.toLocaleString();
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<{ postgres?: { size: string | null }; chromadb?: { status: string; embeddingCount?: number; info?: any } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenType, setRegenType] = useState("all");
  const [regenMax, setRegenMax] = useState(50);
  const [regenResult, setRegenResult] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ethos_admin_token");
    if (saved) setToken(saved);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setToken(null);
        localStorage.removeItem("ethos_admin_token");
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStorageMetrics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/storage-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStorageMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch storage metrics:", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStatus();
      fetchStorageMetrics();
    }
  }, [token, fetchStatus, fetchStorageMetrics]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [token, fetchStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        return;
      }
      localStorage.setItem("ethos_admin_token", data.token);
      setToken(data.token);
    } catch {
      setLoginError("Network error");
    }
  };

  const handleRegenerate = async () => {
    if (!token) return;
    setRegenerating(true);
    setRegenResult(null);
    try {
      const res = await fetch("/api/admin/regenerate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: regenType, maxItems: regenMax }),
      });
      const data = await res.json();
      setRegenResult(
        `Regenerated: ${data.storiesRegenerated || 0} stories, ${data.commentsRegenerated || 0} comments` +
        (data.errors?.length ? `. Errors: ${data.errors.length}` : "")
      );
      fetchStatus();
    } catch {
      setRegenResult("Regeneration request failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setStatus(null);
    localStorage.removeItem("ethos_admin_token");
  };

  if (!token) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-2xl font-bold text-gray-100 mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded transition-colors"
        >
          Logout
        </button>
      </div>

      {loading && !status && (
        <div className="text-gray-400">Loading status...</div>
      )}

      {status && (
        <>
          {/* Health */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusCard
              label="Database"
              value={status.health.database ? "Connected" : "Down"}
              ok={status.health.database}
            />
            <StatusCard
              label="ChromaDB"
              value={status.health.chromadb ? "Connected" : "Down"}
              ok={status.health.chromadb}
            />
            <StatusCard
              label="Stories"
              value={`${formatNumber(status.data.embeddedStories)} / ${formatNumber(status.data.storyCount)}`}
              sub="analyzed / total"
            />
            <StatusCard
              label="Comments"
              value={`${formatNumber(status.data.embeddedComments)} / ${formatNumber(status.data.commentCount)}`}
              sub="analyzed / total"
            />
          </div>

          {/* Storage Metrics */}
          {storageMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <StatusCard
                label="Postgres Database"
                value={storageMetrics.postgres?.size || "Unknown"}
                sub="disk usage"
              />
              <StatusCard
                label="ChromaDB"
                value={storageMetrics.chromadb?.embeddingCount ? `${formatNumber(storageMetrics.chromadb.embeddingCount)} embeddings` : storageMetrics.chromadb?.status === "connected" ? "Connected" : "Disconnected"}
                ok={storageMetrics.chromadb?.status === "connected"}
                sub="embedding storage"
              />
            </div>
          )}

          {/* Worker */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Background Worker</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Status: </span>
                <span className={status.worker.running ? "text-green-400" : "text-yellow-400"}>
                  {status.worker.running ? "Running" : "Idle"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Processing: </span>
                <span className="text-gray-300 truncate block">{status.worker.currentlyProcessing || "Idle"}</span>
              </div>
              <div>
                <span className="text-gray-500">Last completed: </span>
                <span className="text-gray-300">
                  {status.worker.lastRunAt
                    ? new Date(status.worker.lastRunAt).toLocaleTimeString()
                    : "Never"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Avg time/story: </span>
                <span className="text-gray-300">
                  {status.worker.avgTimePerStory != null ? `~${status.worker.avgTimePerStory}s` : "Calculating..."}
                </span>
              </div>
            </div>

            {/* Progress summary */}
            <div className="mt-4 p-3 bg-gray-900 rounded-lg">
              {status.worker.cyclePhase && status.worker.cycleTotal > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Cycle progress</span>
                    <span className="text-gray-300">
                      {status.worker.cycleCurrent} / {status.worker.cycleTotal} stories
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-800 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(status.worker.cycleCurrent / status.worker.cycleTotal) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div>
                      <span className="text-gray-400">{formatNumber(status.data.embeddedStories)}</span> stories embedded
                    </div>
                    <div>
                      <span className="text-gray-400">{formatNumber(status.data.embeddedComments)}</span> comments embedded
                    </div>
                    <div>
                      {status.worker.avgTimePerStory != null && status.worker.cycleCurrent < status.worker.cycleTotal ? (
                        <>ETA: <span className="text-gray-400">~{formatEta((status.worker.cycleTotal - status.worker.cycleCurrent) * status.worker.avgTimePerStory)}</span></>
                      ) : status.worker.cycleCurrent > 0 && status.worker.cycleCurrent < status.worker.cycleTotal ? (
                        <span className="text-gray-400">{formatNumber(status.worker.cycleTotal - status.worker.cycleCurrent)} remaining</span>
                      ) : (
                        <span>Processing...</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Total analyzed</span>
                    <span className="text-gray-300">
                      {formatNumber(status.data.embeddedStories)} stories, {formatNumber(status.data.embeddedComments)} comments
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {status.data.pendingStories === 0 && status.data.pendingComments === 0 ? (
                      <span className="text-green-400">All caught up — waiting for next cycle</span>
                    ) : (
                      <span>{formatNumber(status.data.pendingStories)} stories and {formatNumber(status.data.pendingComments)} comments pending</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Rate of change */}
            {status.worker.lastRunResult && (
              <div className="mt-3 text-xs text-gray-500 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400">Analyzed this cycle</span>
                  <div className="text-sm font-mono text-blue-400 mt-1">{formatNumber(status.worker.lastRunResult.ingested)}</div>
                </div>
                <div>
                  <span className="text-gray-400">New from HN</span>
                  <div className="text-sm font-mono text-green-400 mt-1">{formatNumber(status.worker.lastRunResult.skipped)}</div>
                </div>
              </div>
            )}

            {/* Last run result */}
            {status.worker.lastRunResult && (
              <div className="mt-3 text-xs text-gray-500 flex gap-4">
                <span>Last cycle: <span className="text-gray-300">{formatNumber(status.worker.lastRunResult.ingested)} new</span></span>
                <span><span className="text-gray-300">{formatNumber(status.worker.lastRunResult.skipped)}</span> cached</span>
                <span><span className="text-gray-300">{formatNumber(status.worker.lastRunResult.tooOld)}</span> too old</span>
                {status.worker.lastRunResult.errors > 0 && (
                  <span className="text-red-400">{formatNumber(status.worker.lastRunResult.errors)} errors</span>
                )}
              </div>
            )}

            {status.worker.recentErrors && status.worker.recentErrors.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-red-400 mb-1">Recent Errors</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {status.worker.recentErrors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded font-mono">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Versions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Analysis Versions</h2>
            <div className="text-sm text-gray-400 mb-3">
              Current version: <span className="text-blue-400 font-mono">{status.analysis.currentVersion}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Story Versions</h3>
                {Object.entries(status.analysis.storyVersions).length > 0 ? (
                  Object.entries(status.analysis.storyVersions).map(([v, count]) => (
                    <div key={v} className="flex justify-between text-sm py-1">
                      <span className={`font-mono ${v === status.analysis.currentVersion ? "text-green-400" : "text-yellow-400"}`}>
                        v{v}
                      </span>
                      <span className="text-gray-400">{formatNumber(count)} stories</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No analyzed stories</span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Comment Versions</h3>
                {Object.entries(status.analysis.commentVersions).length > 0 ? (
                  Object.entries(status.analysis.commentVersions).map(([v, count]) => (
                    <div key={v} className="flex justify-between text-sm py-1">
                      <span className={`font-mono ${v === status.analysis.currentVersion ? "text-green-400" : "text-yellow-400"}`}>
                        v{v}
                      </span>
                      <span className="text-gray-400">{formatNumber(count)} comments</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No analyzed comments</span>
                )}
              </div>
            </div>
            {(status.analysis.storiesNeedingUpdate > 0 || status.analysis.commentsNeedingUpdate > 0) && (
              <div className="mt-3 text-sm text-yellow-400">
                ⚠️ {formatNumber(status.analysis.storiesNeedingUpdate)} stories and {formatNumber(status.analysis.commentsNeedingUpdate)} comments need re-analysis
              </div>
            )}
          </div>

          {/* Regeneration */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Regenerate Analysis</h2>
            <p className="text-sm text-gray-500 mb-4">
              Re-run LLM analysis on items with outdated analysis versions.
            </p>
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={regenType}
                  onChange={(e) => setRegenType(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm"
                >
                  <option value="all">All</option>
                  <option value="stories">Stories only</option>
                  <option value="comments">Comments only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max items</label>
                <input
                  type="number"
                  value={regenMax}
                  onChange={(e) => setRegenMax(parseInt(e.target.value) || 10)}
                  className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm"
                  min={1}
                  max={500}
                />
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded font-medium transition-colors"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
            {regenResult && (
              <div className="mt-3 text-sm text-gray-300 bg-gray-900 p-3 rounded">
                {regenResult}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ label, value, ok, sub }: { label: string; value: string; ok?: boolean; sub?: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase mb-1">{label}</div>
      <div className={`text-lg font-semibold ${ok === true ? "text-green-400" : ok === false ? "text-red-400" : "text-gray-200"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
