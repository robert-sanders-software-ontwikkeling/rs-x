#!/bin/zsh

set -euo pipefail

script_dir="${0:A:h}"
package_root="${script_dir:h}"
repo_root="${package_root:h}"

cd "$repo_root"

echo "Preparing local RS-X packages from $repo_root"

pnpm --filter @rs-x/core run build
pnpm --filter @rs-x/state-manager run build
pnpm --filter @rs-x/expression-parser run build
pnpm --filter @rs-x/compiler run build
pnpm --filter @rs-x/typescript-plugin run build
pnpm --filter @rs-x/react run build
pnpm --filter @rs-x/vue run build
pnpm run build:angular
