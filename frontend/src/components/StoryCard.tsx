"use client";

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

const sentimentColors: Record<string, string> = {
  very_positive: "bg-green-100 text-green-800",
  positive: "bg-green-50 text-green-700",
  neutral: "bg-gray-100 text-gray-700",
  negative: "bg-red-50 text-red-700",
  very_negative: "bg-red-100 text-red-800",
};

function timeAgo(unixTime: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unixTime;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function StoryCard({ story }: { story: Story }) {
  const domain = story.url
    ? new URL(story.url).hostname.replace("www.", "")
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center text-sm text-gray-500 min-w-[40px]">
          <span className="font-semibold text-hn-orange">{story.score}</span>
          <span className="text-xs">pts</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <a
              href={story.url || `https://news.ycombinator.com/item?id=${story.hnId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-900 hover:text-hn-orange transition-colors line-clamp-2"
            >
              {story.title}
            </a>
          </div>

          {domain && (
            <span className="text-xs text-gray-400 mt-0.5 inline-block">
              ({domain})
            </span>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
            <span>by {story.by}</span>
            <span>•</span>
            <span>{timeAgo(story.time)}</span>
            <span>•</span>
            <a
              href={`https://news.ycombinator.com/item?id=${story.hnId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-hn-orange"
            >
              {story.descendants} comments
            </a>
            {story.embedded && (
              <>
                <span>•</span>
                <span className="text-green-600">✓ embedded</span>
              </>
            )}
          </div>

          {story.semanticSummary && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {story.semanticSummary}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {story.sentimentLabel && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  sentimentColors[story.sentimentLabel] || sentimentColors.neutral
                }`}
              >
                {story.sentimentLabel.replace("_", " ")}
              </span>
            )}
            {story.semanticTopics?.map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
