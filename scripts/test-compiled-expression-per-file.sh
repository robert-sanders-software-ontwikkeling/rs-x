#!/usr/bin/env bash
set -euo pipefail

# Keep per-file test run for low RAM systems (16GB or lower).
# Usage: pnpm test:compiled-expression:per-file

files=(
  "rs-x-expression-parser/tests/compiled-expression/expressions/identifier-expression.test.ts"
  "rs-x-expression-parser/tests/compiled-expression/expressions/array-expression.test.ts"
  "rs-x-expression-parser/tests/compiled-expression/expressions/conditional-expression.test.ts"
  "rs-x-expression-parser/tests/compiled-expression/expressions/function-expression.test.ts"
  "rs-x-expression-parser/tests/compiled-expression/expressions/sequence-expression.test.ts"
  "rs-x-expression-parser/tests/compiled-expression/expressions/computed-index-expression.test.ts"
  "rs-x-expression-parser/tests/compiled-expression/compiled-expression.integration.test.ts"
)

for f in "${files[@]}"; do
  echo "--- $f"
  pnpm jest --runInBand --no-cache --config jest.config.ts "$f"
done
