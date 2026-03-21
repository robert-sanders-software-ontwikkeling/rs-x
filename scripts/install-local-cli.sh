#!/usr/bin/env bash

set -euo pipefail

dry_run=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      dry_run=true
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cli_dir="$repo_root/rs-x-cli"

if [[ ! -d "$cli_dir" ]]; then
  echo "Could not find CLI directory: $cli_dir" >&2
  exit 1
fi

echo "Using CLI directory: $cli_dir"

cd "$cli_dir"

echo "Running CLI build..."
if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] npm run build"
else
  npm run build
fi

echo "Creating npm tarball..."
if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] npm pack"
  tarball_name="$(node -p "const p=require('./package.json'); const safeName=p.name.replace(/^@/, '').replace('/', '-'); \`\${safeName}-\${p.version}.tgz\`")"
else
  tarball_name="$(npm pack --silent)"
fi

tarball_path="$cli_dir/$tarball_name"
echo "Tarball: $tarball_path"

echo "Installing tarball globally..."
if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] npm i -g --force \"$tarball_path\""
else
  npm i -g --force "$tarball_path"
fi

echo "Verifying rsx command..."
if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] rsx version"
else
  if command -v rsx >/dev/null 2>&1; then
    rsx version
  else
    echo "rsx command not found yet in current shell."
    echo "Open a new terminal or run: rehash"
  fi
fi

echo "Done."
