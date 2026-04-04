#!/bin/zsh

set -u

unset INIT_CWD
unset npm_package_json
unset npm_package_name
unset npm_package_version
unset npm_lifecycle_event
unset npm_lifecycle_script
unset npm_config_local_prefix
unset npm_prefix
unset npm_execpath
unset npm_command
unset npm_config_node_linker
unset NPM_CONFIG_NODE_LINKER
export CI=true

script_dir="${0:A:h}"
package_root="${script_dir:h}"
rsx_cmd=(node "$package_root/bin/rsx.cjs")
default_base_dir="$package_root/.tests/rsx-cli-mutation-smoke"

base_dir="${RSX_MUTATION_VERIFY_DIR:-$default_base_dir}"
pm="${RSX_PM:-npm}"
tag_flag="${RSX_TAG_FLAG:---next}"
skip_vscode_flag="${RSX_SKIP_VSCODE_FLAG:---skip-vscode}"
project_smoke_dir="${RSX_PROJECT_VERIFY_DIR:-$base_dir/project-smoke}"
setup_smoke_dir="${RSX_SETUP_VERIFY_DIR:-$base_dir/setup-smoke}"

typeset -a summary_lines
overall_status=0

run_in_log() {
  local log_file="$1"
  shift

  "$@" < /dev/null >"$log_file" 2>&1
}

run_in_dir_log() {
  local project_dir="$1"
  local log_file="$2"
  shift 2

  (
    cd "$project_dir" || exit 1
    "$@" < /dev/null
  ) >"$log_file" 2>&1
}

run_in_dir_with_input_log() {
  local project_dir="$1"
  local log_file="$2"
  local input_text="$3"
  shift 3

  (
    cd "$project_dir" || exit 1
    printf '%s' "$input_text" | "$@"
  ) >"$log_file" 2>&1
}

print_log_tail() {
  local log_file="$1"

  printf '  log: %s\n' "$log_file"
  printf '  last lines:\n'
  tail -n 20 "$log_file" | sed 's/^/    /'
}

run_step() {
  local label="$1"
  local step_name="$2"
  local log_file="$3"
  shift 3

  printf '%s: %s...\n' "$label" "$step_name"
  if ! run_in_log "$log_file" "$@"; then
    printf '%s: %s failed.\n' "$label" "$step_name"
    print_log_tail "$log_file"
    return 1
  fi

  return 0
}

run_step_in_dir() {
  local label="$1"
  local step_name="$2"
  local project_dir="$3"
  local log_file="$4"
  shift 4

  printf '%s: %s...\n' "$label" "$step_name"
  if ! run_in_dir_log "$project_dir" "$log_file" "$@"; then
    printf '%s: %s failed.\n' "$label" "$step_name"
    print_log_tail "$log_file"
    return 1
  fi

  return 0
}

run_step_in_dir_with_input() {
  local label="$1"
  local step_name="$2"
  local project_dir="$3"
  local log_file="$4"
  local input_text="$5"
  shift 5

  printf '%s: %s...\n' "$label" "$step_name"
  if ! run_in_dir_with_input_log "$project_dir" "$log_file" "$input_text" "$@"; then
    printf '%s: %s failed.\n' "$label" "$step_name"
    print_log_tail "$log_file"
    return 1
  fi

  return 0
}

create_generic_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-generic-init-verify",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node ../dist/main.js"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": [
    "src/**/*.ts"
  ]
}
EOF

  cat >"$project_dir/src/main.ts" <<'EOF'
export async function main(): Promise<void> {
  console.log('rsx generic init smoke test');
}

main();
EOF
}

set_build_config_paths() {
  local project_dir="$1"

  node -e "
const fs = require('node:fs');
const path = require('node:path');
const configPath = path.join(process.argv[1], 'rsx.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.build = {
  ...(config.build || {}),
  preparse: true,
  preparseFile: 'tmp/generated/custom-preparse.ts',
  compiled: true,
  compiledFile: 'tmp/generated/custom-compiled.ts',
  registrationFile: 'tmp/generated/custom-registration.ts',
  compiledResolvedEvaluator: false,
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
" "$project_dir"
}

rm -rf "$base_dir"
mkdir -p "$base_dir"

printf 'Using workspace: %s\n' "$base_dir"
printf 'Using package manager: %s\n' "$pm"
printf 'Using tag flag: %s\n' "$tag_flag"

install_dir="$base_dir/install-compiler-verify"
generic_dir="$base_dir/init-add-verify"

printf '\n== install-compiler ==\n'
rm -rf "$install_dir"
mkdir -p "$install_dir"
cat >"$install_dir/package.json" <<'EOF'
{
  "name": "rsx-install-compiler-verify",
  "private": true
}
EOF

if ! run_step_in_dir "install-compiler" "command" "$install_dir" "$base_dir/install-compiler.log" \
  "${rsx_cmd[@]}" install compiler --pm "$pm" "$tag_flag"
then
  summary_lines+=("install-compiler: failed")
  overall_status=1
else
  if rg -q '"@rs-x/compiler"|"@rs-x/typescript-plugin"' "$install_dir/package.json"; then
    summary_lines+=("install-compiler: pass")
  else
    printf 'install-compiler: package.json missing expected deps.\n'
    summary_lines+=("install-compiler: verify failed")
    overall_status=1
  fi
fi

printf '\n== init-and-add ==\n'
create_generic_project "$generic_dir"

  if ! run_step_in_dir "init-and-add" "npm install" "$generic_dir" "$base_dir/init-install.log" "$pm" install; then
    summary_lines+=("init-and-add: npm install failed")
    overall_status=1
  else
  if ! run_step_in_dir "init-and-add" "rsx init" "$generic_dir" "$base_dir/init.log" \
    "${rsx_cmd[@]}" init --pm "$pm" "$tag_flag" "$skip_vscode_flag" --entry src/main.ts
  then
    summary_lines+=("init-and-add: init failed")
    overall_status=1
  elif ! run_step_in_dir_with_input "init-and-add" "rsx add" "$generic_dir" "$base_dir/add.log" \
    $'sampleExpression\n\nsrc/expressions\nn\n' \
    "${rsx_cmd[@]}" add
  then
    summary_lines+=("init-and-add: add failed")
    overall_status=1
  elif [[ ! -f "$generic_dir/rsx.config.json" ]]; then
    printf 'init-and-add: rsx.config.json was not created.\n'
    summary_lines+=("init-and-add: missing rsx.config.json")
    overall_status=1
  elif ! set_build_config_paths "$generic_dir"; then
    printf 'init-and-add: failed to patch rsx.config.json.\n'
    summary_lines+=("init-and-add: config patch failed")
    overall_status=1
  elif ! run_step_in_dir "init-and-add" "rsx build" "$generic_dir" "$base_dir/build.log" \
    "${rsx_cmd[@]}" build --project tsconfig.json --no-emit --prod
  then
    summary_lines+=("init-and-add: build failed")
    overall_status=1
  elif [[ ! -f "$generic_dir/tmp/generated/custom-preparse.ts" || ! -f "$generic_dir/tmp/generated/custom-compiled.ts" ]]; then
    printf 'init-and-add: custom rsx.config.json build outputs were not generated.\n'
    summary_lines+=("init-and-add: custom build outputs missing")
    overall_status=1
  elif ! run_step_in_dir "init-and-add" "rsx typecheck" "$generic_dir" "$base_dir/typecheck.log" \
    "${rsx_cmd[@]}" typecheck --project tsconfig.json
  then
    summary_lines+=("init-and-add: typecheck failed")
    overall_status=1
  else
    summary_lines+=("init-and-add: pass")
  fi
fi

printf '\n== project ==\n'
if ! run_step "project" "smoke" "$base_dir/project-smoke.log" \
  env RSX_PROJECT_VERIFY_DIR="$project_smoke_dir" RSX_PM="$pm" RSX_TAG_FLAG="$tag_flag" RSX_SKIP_VSCODE_FLAG="$skip_vscode_flag" \
  zsh "$script_dir/verify-rsx-projects.sh"
then
  summary_lines+=("project: failed")
  overall_status=1
else
  summary_lines+=("project: pass")
fi

printf '\n== setup ==\n'
if ! run_step "setup" "smoke" "$base_dir/setup-smoke.log" \
  env RSX_SETUP_VERIFY_DIR="$setup_smoke_dir" RSX_PM="$pm" RSX_TAG_FLAG="$tag_flag" RSX_SKIP_VSCODE_FLAG="$skip_vscode_flag" \
  zsh "$script_dir/verify-rsx-setup.sh"
then
  summary_lines+=("setup: failed")
  overall_status=1
else
  summary_lines+=("setup: pass")
fi

printf '\nSummary\n'
for line in "${summary_lines[@]}"; do
  printf '  %s\n' "$line"
done

exit "$overall_status"
