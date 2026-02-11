"use client";

import { useState, useEffect, useCallback } from "react";
import StoryCard from "./StoryCard";

interface Story {
  id: number;
  hnId: number;
  title: string;
  url: string | null;
  by: string;
  score: number;
  time: number;
  descendants: number;
  semanticSummary: string | null;
  semanticTopics: string[] | null;
  sentimentLabel: string | null;
  embedded: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StoryList() {
  const [stories, setStories] = useState<Story[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [page, setPage] = useState(1);

  const fetchStories = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stories?page=${p}&limit=20`);
      const data = await res.json();
      setStories(data.stories || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories(page);
  }, [page, fetchStories]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json();
      alert(
        `Ingested: ${data.ingested}, Skipped: ${data.skipped}, Errors: ${data.errors}`
      );
      fetchStories(page);
    } catch (error) {
      console.error("Ingestion failed:", error);
      alert("Ingestion failed. Check the console for details.");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Recent Stories</h2>
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="px-4 py-2 bg-hn-orange text-white rounded-lg text-sm font-medium
                     hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {ingesting ? "Ingesting..." : "Fetch New Stories"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No stories yet</p>
          <p className="text-sm">
            Click &quot;Fetch New Stories&quot; to ingest stories from Hacker
            News
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-30"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="px-3 py-1 rounded border text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
