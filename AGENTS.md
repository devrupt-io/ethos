# Agent Guidelines

## Testing

Run `./run-tests.sh` after making changes to ensure all tests pass. The test
runner uses ephemeral containers with a separate database. You can review
previous results with `./run-tests.sh --last`.

All 13 tests must pass before marking a task as complete.

## API Verification

Verify API endpoints respond correctly using `curl`:

```bash
# Health — should return {"status":"healthy"} with worker running
curl http://localhost:23101/api/health

# Stories — should return analyzed stories with concepts, sentiment, etc.
curl http://localhost:23101/api/stories

# Insights — should return trending concepts, sentiment distribution, discourse
curl http://localhost:23101/api/insights/concepts
curl http://localhost:23101/api/insights/sentiment
curl http://localhost:23101/api/insights/discourse

# Semantic search — search by concept, not keyword
curl -X POST http://localhost:23101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"open source sustainability","type":"stories"}'

# Frontend — should return HTTP 200
curl -o /dev/null -w "%{http_code}" http://localhost:23100/
```

## Docker Stack

The dev stack is started with `docker compose --profile dev up -d`. Verify all
four containers are running (postgres, chromadb, backend, frontend) with
`docker compose --profile dev ps`.

To rebuild after code changes: `docker compose --profile dev up -d --build`

To reset all data (fresh start): `docker compose --profile dev down -v`

## Background Worker

The backend starts a background worker automatically on boot that:
1. Fetches top 30 HN stories immediately, then every 5 minutes
2. Analyzes each story and its top 10 comments with structured LLM output
3. Generates vector embeddings from the semantic analysis
4. Stores embeddings in ChromaDB for similarity search
5. Skips already-seen stories and comments (caching by hnId)

Check worker status via the health endpoint's `checks.worker` field.

## OpenRouter Integration

- Uses structured output (`response_format` with `json_schema`) for reliable analysis
- Falls back to prompt-based JSON extraction if the provider doesn't support structured output
- Uses `reasoning: { exclude: true }` for Qwen models (required by OpenRouter)
- Story analysis extracts: core idea, concepts, community angle, sentiment, controversy, depth
- Comment analysis extracts: argument summary, concepts, comment type, sentiment

## Completion Criteria

Ask for verification that the task has been completed before marking it as done
so that human review may occur.

## Container Isolation

Host `node_modules/` and build artifacts must not leak into containers.
The `.dockerignore` files in `backend/` and `frontend/` enforce this.
