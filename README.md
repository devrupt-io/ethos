# ethos

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)

> Explore what Hacker News is *really* thinking — concepts, sentiment, and discourse patterns extracted through LLM-powered semantic analysis and vector embeddings.

`ethos` goes beyond surface-level HN browsing. It automatically ingests stories
and comments, uses LLM structured output to extract deep concepts (like
"technological determinism" or "open source sustainability"), tracks entities
(companies, products, and OSS projects like "OpenAI" or "SQLite"), identifies
specific technologies, embeds them as vectors in ChromaDB, and presents insights
about what ideas are trending, how the community feels about specific companies
and technologies, and what kinds of arguments people are making.

**Not a proxy.** ethos doesn't just reformat HN's homepage — it analyzes the
underlying ideas, clusters them semantically, and surfaces patterns that aren't
visible from reading individual stories.

## Features

- 🧠 **Concept Explorer** — See what abstract ideas HN is engaging with, sized by frequency, colored by sentiment
- 🏢 **Entity Tracker** — Track companies, products, services, and open-source projects being discussed, with community sentiment toward each
- 📊 **Sentiment Analysis** — Community emotional temperature, controversy levels, intellectual depth
- 💬 **Discourse Patterns** — What types of arguments people make (technical insights, counterarguments, personal experience, etc.)
- 🔍 **Semantic Search** — Search by concept, not keywords ("fear of AI replacing jobs" finds relevant discussions)
- ⚡ **Background Ingestion** — Automatic polling and processing, no manual triggers
- 🗄️ **Smart Caching** — Already-seen stories and comments are skipped to save time and API costs
- 🔧 **Admin Dashboard** — Monitor worker progress, analysis versions, and trigger re-analysis

## Development

### Built With

- **OpenRouter** for LLM inference (structured output + reasoning token exclusion) and vector embeddings
- **ChromaDB** for similarity search across embedded concepts
- **TypeScript** as the programming language for both frontend and backend
- **Next.js** with Tailwind CSS for the frontend
- **Express** for the RESTful HTTP backend
- **Sequelize** ORM with PostgreSQL for persistent storage
- **Docker Compose** for development, testing, and deployment

### Quick Start

```
git clone https://github.com/devrupt-io/ethos.git
cd ethos
cp example.env .env  # then edit .env with your OpenRouter API key
docker compose --profile dev up -d
```

This will bring up a frontend on `http://localhost:23100` and a backend running
on `http://localhost:23101` in development mode supporting Hot Module Reload
(HMR) allowing for rapid development. Under the hood Next.js redirects all of
the `/api/*` URLs to the backend.

The background worker starts automatically on boot and begins ingesting HN
stories and comments. Concepts, sentiment, and discourse data will appear in the
UI within a few minutes.

### Architecture

```
Frontend (Next.js + Tailwind)
  ├── Concept Explorer (trending ideas + sentiment)
  ├── Entity Tracker (companies, products, OSS projects + sentiment)
  ├── Sentiment Dashboard (controversy, depth)
  ├── Discourse View (argument types, strong opinions)
  └── Semantic Search (vector similarity)
            ↓ /api/* proxy
Backend (Express + TypeScript)
  ├── Background Worker (auto-polls HN every 5min)
  │     ├── Fetches top stories + comments
  │     ├── LLM Analysis (structured output via OpenRouter)
  │     │     ├── Concepts (abstract ideas, philosophies)
  │     │     ├── Entities (companies, products, services)
  │     │     ├── Technologies (languages, frameworks, tools)
  │     │     └── Sentiment + controversy scoring
  │     └── Vector Embedding (stored in ChromaDB)
  ├── PostgreSQL (stories, comments, analysis metadata)
  ├── ChromaDB (vector similarity search)
  └── OpenRouter (Qwen models: chat + embeddings)
```

### Analysis Model

ethos extracts three complementary dimensions from every HN story and comment:

- **Concepts** — Abstract ideas, philosophies, and themes (e.g. "open source sustainability", "surveillance capitalism", "right to repair")
- **Entities** — Companies, brands, products, services, and notable OSS projects (e.g. "OpenAI", "Hetzner", "SQLite", "ChatGPT")
- **Technologies** — Programming languages, frameworks, tools, and platforms (e.g. "Rust", "PostgreSQL", "Kubernetes")

This separation ensures users can track both the philosophical discourse *and* the concrete products/companies the community is discussing. Sentiment is scored independently for each item, so you can see that HN loves SQLite but is skeptical of certain SaaS pricing models.

### Testing

There is a `run-tests.sh` script which uses an ephemeral testing container to
run all of the tests in a clean environment with a separate database than
production that is wiped before test runs.

```
./run-tests.sh
```

You may also run `./run-tests.sh --last` to see the output from the last test
run without re-running the tests, which is useful for grepping for different
things or reviewing test results.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with data counts |
| GET | `/api/stories` | List analyzed stories with concepts (paginated) |
| GET | `/api/stories/:hnId` | Get a story by HN ID |
| GET | `/api/comments` | List comments (paginated, filterable by storyHnId) |
| POST | `/api/search` | Semantic search by concept across stories or comments |
| GET | `/api/insights/concepts` | Trending concepts with sentiment and story connections |
| GET | `/api/insights/concepts/:name` | Detailed view of a specific concept with stories and comments |
| GET | `/api/insights/entities` | Trending companies, products, and OSS projects with sentiment |
| GET | `/api/insights/sentiment` | Sentiment distribution, controversy, and depth metrics |
| GET | `/api/insights/discourse` | Comment type distribution and strongest arguments |
| GET | `/api/insights/timeline` | Time-series data for dashboard charts |
| POST | `/api/admin/login` | Admin authentication |
| GET | `/api/admin/status` | Combined health, worker, and analysis status (auth required) |
| POST | `/api/admin/regenerate` | Re-analyze items with outdated analysis versions (auth required) |

### Deployment

A Caddyfile is provided that is used to serve the docker containers in
production. In this configuration the frontend is served on `localhost:23110`
and the backend on `localhost:23111`, with Caddy being used to serve both under
a single domain such as `ethos.devrupt.io` without HMR.

All configurations are available in the `.env` file at the top level of this
repository and a `example.env` file is provided to help you get started.

_(Note: Postgres is intentionally never exposed outside of the container stack
and you NEED to set a strong password if you expose it or your container will
get popped in seconds)_

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source under the MIT License.

## FAQ

### What is Hacker News?

Hacker News (HN) is a community where technology and enthusiasts share and
comment on stories. It was created by [Y Combinator](https://ycombinator.com)

### What value does HN provide?

The community is often ahead of Reddit or Facebook with interesting or impactful
events or insights because many work for large companies or the government.

### What is HN lacking?

HN is intentionally designed to be a simple website without many features. For
example, the website uses very minimal javascript and offers very limited
theming.

These lack of features lead the community to instead fill the gaps as HN is very
open with their data.

### How is HN open with their data?

HN provides a free and easy to use [API](https://github.com/HackerNews/API)
allowing anyone access to resources such as stories, comments, users with
support for filtering. For example, you can easily request all of the stories
about Google within the last week.
