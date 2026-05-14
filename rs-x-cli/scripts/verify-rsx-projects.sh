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
default_base_dir="$package_root/.tests/rsx-project-smoke"
prebuild_script="$script_dir/prepare-local-rsx-packages.sh"

base_dir="${RSX_PROJECT_VERIFY_DIR:-$default_base_dir}"
work_base_dir="${RSX_PROJECT_WORK_DIR:-$base_dir/workspace}"
pm="${RSX_PM:-npm}"
tag_flag="${RSX_TAG_FLAG:---next}"
skip_vscode_flag="${RSX_SKIP_VSCODE_FLAG:---skip-vscode}"

frameworks=(
  "angular:angular"
  "react:react"
  "vue:vuejs"
  "next:nextjs"
)

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

print_log_tail() {
  local log_file="$1"

  printf '  log: %s\n' "$log_file"
  printf '  last lines:\n'
  tail -n 20 "$log_file" | sed 's/^/    /'
}

rm -rf "$base_dir"
mkdir -p "$base_dir"
mkdir -p "$work_base_dir"
cat > "$work_base_dir/package.json" <<'EOF'
{
  "name": "rsx-project-smoke-workspace",
  "private": true
}
EOF
: > "$work_base_dir/.npmrc"

printf 'Using workspace: %s\n' "$base_dir"
printf 'Using project dir: %s\n' "$work_base_dir"
printf 'Using package manager: %s\n' "$pm"
printf 'Using tag flag: %s\n' "$tag_flag"

printf 'Preparing local RS-X packages...\n'
if ! run_in_log "$base_dir/prepare-packages.log" zsh "$prebuild_script"; then
  printf 'Preparation failed.\n'
  print_log_tail "$base_dir/prepare-packages.log"
  exit 1
fi

cd "$work_base_dir" || exit 1

for entry in "${frameworks[@]}"; do
  display_name="${entry%%:*}"
  template_name="${entry##*:}"
  project_dir="$work_base_dir/rsx-project-${display_name}-verify"
  scaffold_log="$base_dir/${display_name}-scaffold.log"
  verify_log="$base_dir/${display_name}-verify.log"
  build_log="$base_dir/${display_name}-build.log"

  rm -rf "$project_dir"

  printf '\n== %s ==\n' "$display_name"
  printf 'Scaffolding %s...\n' "$project_dir"

  if ! run_in_log \
    "$scaffold_log" \
    "${rsx_cmd[@]}" project "$template_name" --name "$(basename "$project_dir")" --project-parent-dir "$work_base_dir" --pm "$pm" "$tag_flag" "$skip_vscode_flag"
  then
    printf 'Scaffold failed.\n'
    print_log_tail "$scaffold_log"
    summary_lines+=("$display_name: scaffold failed")
    overall_status=1
    continue
  fi

  if ! run_in_dir_log "$project_dir" "$verify_log" node -e "
const fs = require('node:fs');
const path = require('node:path');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const expectedByFramework = {
  angular: {
    scripts: ['build:rsx', 'start'],
    deps: ['@rs-x/angular', '@rs-x/compiler', '@rs-x/typescript-plugin'],
    files: ['src/main.ts', 'src/app/app.component.ts'],
    config: {
      buildFolder: '.rsx-generated',
      baseDirectory: 'src/rsx'
    }
  },
  react: {
    scripts: ['build:rsx', 'dev', 'build'],
    deps: ['@rs-x/react', '@rs-x/compiler', '@rs-x/typescript-plugin'],
    files: ['src/main.tsx', 'src/rsx-bootstrap.ts', 'src/app/app.tsx'],
    bootstrap: 'src/rsx-bootstrap.ts',
    config: {
      buildFolder: '.rsx-generated',
      baseDirectory: 'src/rsx'
    }
  },
  vue: {
    scripts: ['build:rsx', 'dev', 'build'],
    deps: ['@rs-x/vue', '@rs-x/compiler', '@rs-x/typescript-plugin'],
    files: ['src/main.ts', 'src/App.vue', 'src/lib/rsx-bootstrap.ts'],
    bootstrap: 'src/lib/rsx-bootstrap.ts',
    config: {
      buildFolder: '.rsx-generated',
      baseDirectory: 'src/rsx'
    }
  },
  next: {
    scripts: ['build:rsx', 'dev', 'build'],
    deps: ['@rs-x/react', '@rs-x/compiler', '@rs-x/typescript-plugin'],
    files: ['app/layout.tsx', 'app/page.tsx', 'components/demo-app.tsx', 'lib/rsx-bootstrap.ts'],
    bootstrap: 'lib/rsx-bootstrap.ts',
    config: {
      buildFolder: '.rsx-generated',
      baseDirectory: 'app/rsx'
    }
  }
};
const expected = expectedByFramework['$display_name'];
for (const key of expected.scripts) {
  if (typeof scripts[key] !== 'string' || scripts[key].trim() === '') {
    throw new Error('Missing script: ' + key);
  }
}
for (const key of expected.deps) {
  if (typeof deps[key] !== 'string') {
    throw new Error('Missing dependency: ' + key);
  }
}
for (const rel of expected.files) {
  if (!fs.existsSync(path.join(process.cwd(), rel))) {
    throw new Error('Missing file: ' + rel);
  }
}
const rsxConfig = JSON.parse(fs.readFileSync('rsx.config.json', 'utf8'));
if (!rsxConfig.build || typeof rsxConfig.build !== 'object') {
  throw new Error('Missing rsx.config.json build section');
}
if (!rsxConfig.cli || !rsxConfig.cli.add || typeof rsxConfig.cli.add !== 'object') {
  throw new Error('Missing rsx.config.json cli.add section');
}
if (rsxConfig.build.buildFolder !== expected.config.buildFolder) {
  throw new Error('Unexpected rsx.config.json build.buildFolder: ' + rsxConfig.build.buildFolder);
}
if (rsxConfig.build.preparseFile !== 'rsx-aot-preparsed.generated.ts') {
  throw new Error('Unexpected rsx.config.json build.preparseFile: ' + rsxConfig.build.preparseFile);
}
if (rsxConfig.build.compiledFile !== 'rsx-aot-compiled.generated.ts') {
  throw new Error('Unexpected rsx.config.json build.compiledFile: ' + rsxConfig.build.compiledFile);
}
if (rsxConfig.cli.add.baseDirectory !== expected.config.baseDirectory) {
  throw new Error('Unexpected rsx.config.json cli.add.baseDirectory: ' + rsxConfig.cli.add.baseDirectory);
}
if (rsxConfig.cli.add.defaultDirectory !== undefined) {
  throw new Error('Unexpected legacy rsx.config.json cli.add.defaultDirectory: ' + rsxConfig.cli.add.defaultDirectory);
}
if (typeof expected.bootstrap === 'string') {
  const bootstrapContents = fs.readFileSync(expected.bootstrap, 'utf8');
  if (!bootstrapContents.includes('/* @vite-ignore */')) {
    throw new Error('Bootstrap file is missing @vite-ignore: ' + expected.bootstrap);
  }
}
" 
  then
    printf 'Verification failed.\n'
    print_log_tail "$verify_log"
    summary_lines+=("$display_name: verify failed")
    overall_status=1
    continue
  fi

  printf 'Building %s...\n' "$project_dir"
  if ! run_in_dir_log "$project_dir" "$build_log" "$pm" run build
  then
    printf 'Build failed.\n'
    print_log_tail "$build_log"
    summary_lines+=("$display_name: build failed")
    overall_status=1
    continue
  fi

  printf 'Build passed.\n'
  summary_lines+=("$display_name: pass")
done

printf '\nSummary\n'
for line in "${summary_lines[@]}"; do
  printf '  %s\n' "$line"
done

exit "$overall_status"
