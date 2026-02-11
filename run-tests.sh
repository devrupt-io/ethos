#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="/tmp/ethos-test-results.log"

if [[ "${1:-}" == "--last" ]]; then
  if [[ -f "$LOG_FILE" ]]; then
    cat "$LOG_FILE"
  else
    echo "No previous test results found."
    exit 1
  fi
  exit 0
fi

echo "=== ethos test runner ==="
echo ""

# Build and run tests in ephemeral containers
echo "Building test containers..."
docker compose --profile test build 2>&1 | tee "$LOG_FILE"

echo ""
echo "Running tests..."
# Use 'run' instead of 'up --abort-on-container-exit' to avoid killing shared dev containers
docker compose --profile test run --rm test-runner 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "Cleaning up test containers..."
docker compose --profile test rm -f -s postgres-test 2>&1 | tee -a "$LOG_FILE"

if [[ $EXIT_CODE -eq 0 ]]; then
  echo ""
  echo "✅ All tests passed!"
else
  echo ""
  echo "❌ Tests failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
