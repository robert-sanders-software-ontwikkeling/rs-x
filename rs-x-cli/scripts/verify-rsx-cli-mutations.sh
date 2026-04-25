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
setup_smoke_dir="${RSX_SETUP_VERIFY_DIR:-$base_dir/init-smoke}"

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

create_react_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-react-init-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/src/main.tsx" <<'EOF'
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div>react init smoke test</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
EOF
}

create_next_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/app"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-next-init-verify",
  "private": true,
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/app/layout.tsx" <<'EOF'
import type { Metadata, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'RS-X smoke test',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-shell">
        {children}
        <div id="portal-root" />
      </body>
    </html>
  );
}
EOF
}

create_next_pages_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/pages"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-next-pages-init-verify",
  "private": true,
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/pages/_app.tsx" <<'EOF'
import type { AppProps } from 'next/app';

function Shell(props: { children: React.ReactNode }) {
  return <main data-shell="true">{props.children}</main>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Shell>
      <Component {...pageProps} />
    </Shell>
  );
}
EOF
}

create_vue_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-vue-init-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/src/main.ts" <<'EOF'
import { createApp } from 'vue';

const App = {
  template: '<div>vue init smoke test</div>',
};

createApp(App).mount('#app');
EOF
}

create_angular_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-angular-init-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "@angular/core": "^20.3.5",
    "@angular/platform-browser": "^20.3.5"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/src/main.ts" <<'EOF'
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  template: '<main>angular init smoke test</main>',
})
class AppComponent {}

bootstrapApplication(AppComponent).catch((error) => console.error(error));
EOF
}

verify_manifest_has_dep() {
  local manifest_path="$1"
  local package_name="$2"

  node -e "
const fs = require('node:fs');
const manifest = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const deps = {
  ...(manifest.dependencies || {}),
  ...(manifest.devDependencies || {}),
};
if (!Object.prototype.hasOwnProperty.call(deps, process.argv[2])) {
  process.exit(1);
}
" "$manifest_path" "$package_name"
}

run_framework_init_case() {
  local label="$1"
  local project_dir="$2"
  local expected_dep="$3"
  local entry_path="$4"
  local create_fn="$5"
  local expected_marker="$6"
  local expected_marker_two="${7:-}"

  printf '\n== %s ==\n' "$label"
  "$create_fn" "$project_dir"

  if ! run_step_in_dir "$label" "rsx init" "$project_dir" "$base_dir/$label.log" \
    "${rsx_cmd[@]}" init --pm "$pm" "$tag_flag" "$skip_vscode_flag" --entry "$entry_path"
  then
    summary_lines+=("$label: init failed")
    overall_status=1
    return
  fi

  if ! verify_manifest_has_dep "$project_dir/package.json" "$expected_dep"; then
    printf '%s: package.json missing %s.\n' "$label" "$expected_dep"
    summary_lines+=("$label: missing $expected_dep")
    overall_status=1
    return
  fi

  if [[ -n "$expected_marker" ]] && ! grep -qF "$expected_marker" "$project_dir/$entry_path"; then
    printf '%s: entry file missing expected marker %s.\n' "$label" "$expected_marker"
    printf 'Contents:\n'
    cat "$project_dir/$entry_path"
    summary_lines+=("$label: entry not wired")
    overall_status=1
    return
  fi

  if [[ -n "$expected_marker_two" ]] && ! grep -qF "$expected_marker_two" "$project_dir/$entry_path"; then
    printf '%s: entry file missing expected marker %s.\n' "$label" "$expected_marker_two"
    printf 'Contents:\n'
    cat "$project_dir/$entry_path"
    summary_lines+=("$label: entry lost existing structure")
    overall_status=1
    return
  fi

  if ! node -e "
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filePath = process.argv[1];
const source = fs.readFileSync(filePath, 'utf8');
const ext = path.extname(filePath).toLowerCase();
const scriptKind =
  ext === '.tsx' ? ts.ScriptKind.TSX :
  ext === '.jsx' ? ts.ScriptKind.JSX :
  ext === '.js' || ext === '.mjs' || ext === '.cjs' ? ts.ScriptKind.JS :
  ts.ScriptKind.TS;
const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
if ((sourceFile.parseDiagnostics || []).length > 0) {
  console.error('parse diagnostics found');
  for (const diagnostic of sourceFile.parseDiagnostics) {
    console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\\n'));
  }
  process.exit(1);
}
" "$project_dir/$entry_path"; then
    printf '%s: entry file no longer parses after init.\n' "$label"
    printf 'Contents:\n'
    cat "$project_dir/$entry_path"
    summary_lines+=("$label: entry parse failed")
    overall_status=1
    return
  fi

  if [[ "$expected_dep" == "@rs-x/vue" && -f "$project_dir/vite.config.ts" ]]; then
    if [[ ! -f "$project_dir/rsx-vite-plugin.mjs" ]]; then
      printf '%s: rsx-vite-plugin.mjs was not created.\n' "$label"
      summary_lines+=("$label: missing vite plugin")
      overall_status=1
      return
    fi
    if [[ ! -f "$project_dir/rsx-vite-plugin.d.mts" ]]; then
      printf '%s: rsx-vite-plugin.d.mts was not created.\n' "$label"
      summary_lines+=("$label: missing vite plugin types")
      overall_status=1
      return
    fi
    if ! grep -qF "from './rsx-vite-plugin.mjs'" "$project_dir/vite.config.ts"; then
      printf '%s: vite.config.ts does not import the RS-X Vite plugin.\n' "$label"
      summary_lines+=("$label: vite plugin not imported")
      overall_status=1
      return
    fi
  fi

  summary_lines+=("$label: pass")
}

CUSTOM_PATHS_CONFIG='{
  "build": {
    "preparse": true,
    "preparseFile": "dist/rsx-generated/rsx-aot-preparsed.generated.ts",
    "compiled": true,
    "compiledFile": "dist/rsx-generated/rsx-aot-compiled.generated.ts",
    "registrationFile": "dist/rsx-generated/rsx-aot-registration.generated.ts",
    "compiledResolvedEvaluator": false
  }
}'

create_react_custom_paths_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-react-custom-paths-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/src/main.tsx" <<'EOF'
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div>react custom paths smoke test</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
EOF

  printf '%s\n' "$CUSTOM_PATHS_CONFIG" >"$project_dir/rsx.config.json"
}

create_vue_custom_paths_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-vue-custom-paths-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/src/main.ts" <<'EOF'
import { createApp } from 'vue';

const App = { template: '<div>vue custom paths smoke test</div>' };
createApp(App).mount('#app');
EOF

  printf '%s\n' "$CUSTOM_PATHS_CONFIG" >"$project_dir/rsx.config.json"
}

create_next_custom_paths_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/app"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-next-custom-paths-verify",
  "private": true,
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/app/layout.tsx" <<'EOF'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
EOF

  printf '%s\n' "$CUSTOM_PATHS_CONFIG" >"$project_dir/rsx.config.json"
}

create_angular_custom_paths_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-angular-custom-paths-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "@angular/core": "^20.3.5",
    "@angular/platform-browser": "^20.3.5"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
EOF

  cat >"$project_dir/src/main.ts" <<'EOF'
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({ selector: 'app-root', template: '<main>angular custom paths smoke test</main>' })
class AppComponent {}

bootstrapApplication(AppComponent).catch((error) => console.error(error));
EOF

  cat >"$project_dir/tsconfig.json" <<'EOF'
{
  "compilerOptions": { "target": "ES2022", "experimentalDecorators": true }
}
EOF

  cat >"$project_dir/angular.json" <<'EOF'
{
  "version": 1,
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            "tsConfig": "tsconfig.json",
            "browser": "src/main.ts"
          }
        }
      }
    }
  }
}
EOF

  printf '%s\n' "$CUSTOM_PATHS_CONFIG" >"$project_dir/rsx.config.json"
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

set_preparse_disabled_config() {
  local project_dir="$1"

  node -e "
const fs = require('node:fs');
const path = require('node:path');
const configPath = path.join(process.argv[1], 'rsx.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.build = {
  ...(config.build || {}),
  preparse: false,
  preparseFile: 'tmp/generated/custom-preparse.ts',
  compiled: true,
  compiledFile: 'tmp/generated/custom-compiled.ts',
  registrationFile: 'tmp/generated/custom-registration.ts',
  compiledResolvedEvaluator: false,
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
" "$project_dir"
}

set_compiled_disabled_config() {
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
  compiled: false,
  compiledFile: 'tmp/generated/custom-compiled.ts',
  registrationFile: 'tmp/generated/custom-registration.ts',
  compiledResolvedEvaluator: false,
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
" "$project_dir"
}

create_add_default_directory_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-add-default-dir-verify",
  "private": true
}
EOF

  cat >"$project_dir/rsx.config.json" <<'EOF'
{
  "cli": {
    "add": {
      "defaultDirectory": "src/custom-expressions",
      "searchRoots": ["src"]
    }
  }
}
EOF
}

create_add_search_roots_project() {
  local project_dir="$1"

  rm -rf "$project_dir"
  mkdir -p "$project_dir/src/expressions"
  mkdir -p "$project_dir/custom-root/expressions"

  cat >"$project_dir/package.json" <<'EOF'
{
  "name": "rsx-add-search-roots-verify",
  "private": true
}
EOF

  # Expression file only in the configured custom searchRoot, not in defaultDirectory
  cat >"$project_dir/custom-root/expressions/existing.expression.ts" <<'EOF'
import { rsx } from '@rs-x/expression-parser';
export const existingExpression = rsx('a + b')({ a: 1, b: 2 });
EOF

  cat >"$project_dir/rsx.config.json" <<'EOF'
{
  "cli": {
    "add": {
      "defaultDirectory": "src/expressions",
      "searchRoots": ["custom-root"]
    }
  }
}
EOF
}

rm -rf "$base_dir"
mkdir -p "$base_dir"

printf 'Using workspace: %s\n' "$base_dir"
printf 'Using package manager: %s\n' "$pm"
printf 'Using tag flag: %s\n' "$tag_flag"

install_dir="$base_dir/install-compiler-verify"
generic_dir="$base_dir/init-add-verify"
react_init_dir="$base_dir/react-init-verify"
next_init_dir="$base_dir/next-init-verify"
vue_init_dir="$base_dir/vue-init-verify"
angular_init_dir="$base_dir/angular-init-verify"
react_custom_paths_dir="$base_dir/react-custom-paths-verify"
vue_custom_paths_dir="$base_dir/vue-custom-paths-verify"
next_custom_paths_dir="$base_dir/next-custom-paths-verify"
angular_custom_paths_dir="$base_dir/angular-custom-paths-verify"
add_default_dir_project_dir="$base_dir/add-default-dir-verify"
add_search_roots_project_dir="$base_dir/add-search-roots-verify"

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
  if grep -qE '"@rs-x/compiler"|"@rs-x/typescript-plugin"' "$install_dir/package.json"; then
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

printf '\n== preparse-disabled ==\n'
if [[ -d "$generic_dir" && -f "$generic_dir/rsx.config.json" ]]; then
  rm -f "$generic_dir/tmp/generated/custom-preparse.ts" "$generic_dir/tmp/generated/custom-compiled.ts"
  if ! set_preparse_disabled_config "$generic_dir"; then
    printf 'preparse-disabled: failed to patch rsx.config.json.\n'
    summary_lines+=("preparse-disabled: config patch failed")
    overall_status=1
  elif ! run_step_in_dir "preparse-disabled" "rsx build" "$generic_dir" "$base_dir/build-preparse-disabled.log" \
    "${rsx_cmd[@]}" build --project tsconfig.json --no-emit --prod
  then
    summary_lines+=("preparse-disabled: build failed")
    overall_status=1
  elif [[ -f "$generic_dir/tmp/generated/custom-preparse.ts" ]]; then
    printf 'preparse-disabled: preparse file was generated despite preparse: false.\n'
    summary_lines+=("preparse-disabled: preparse file should not exist")
    overall_status=1
  elif [[ ! -f "$generic_dir/tmp/generated/custom-compiled.ts" ]]; then
    printf 'preparse-disabled: compiled file was not generated.\n'
    summary_lines+=("preparse-disabled: compiled file missing")
    overall_status=1
  else
    summary_lines+=("preparse-disabled: pass")
  fi
else
  printf 'preparse-disabled: skipped (init-and-add did not complete).\n'
  summary_lines+=("preparse-disabled: skipped")
fi

printf '\n== compiled-disabled ==\n'
if [[ -d "$generic_dir" && -f "$generic_dir/rsx.config.json" ]]; then
  rm -f "$generic_dir/tmp/generated/custom-preparse.ts" "$generic_dir/tmp/generated/custom-compiled.ts"
  if ! set_compiled_disabled_config "$generic_dir"; then
    printf 'compiled-disabled: failed to patch rsx.config.json.\n'
    summary_lines+=("compiled-disabled: config patch failed")
    overall_status=1
  elif ! run_step_in_dir "compiled-disabled" "rsx build" "$generic_dir" "$base_dir/build-compiled-disabled.log" \
    "${rsx_cmd[@]}" build --project tsconfig.json --no-emit --prod
  then
    summary_lines+=("compiled-disabled: build failed")
    overall_status=1
  elif [[ ! -f "$generic_dir/tmp/generated/custom-preparse.ts" ]]; then
    printf 'compiled-disabled: preparse file was not generated.\n'
    summary_lines+=("compiled-disabled: preparse file missing")
    overall_status=1
  elif [[ -f "$generic_dir/tmp/generated/custom-compiled.ts" ]]; then
    printf 'compiled-disabled: compiled file was generated despite compiled: false.\n'
    summary_lines+=("compiled-disabled: compiled file should not exist")
    overall_status=1
  else
    summary_lines+=("compiled-disabled: pass")
  fi
else
  printf 'compiled-disabled: skipped (init-and-add did not complete).\n'
  summary_lines+=("compiled-disabled: skipped")
fi

printf '\n== add-default-directory ==\n'
create_add_default_directory_project "$add_default_dir_project_dir"
# Input: name, source (default), no-kebab, dir (accept default from config), mode 1 (create-inline)
if ! run_step_in_dir_with_input "add-default-directory" "rsx add" "$add_default_dir_project_dir" "$base_dir/add-default-dir.log" \
  $'myExpr\n\nn\n\n1\n' \
  "${rsx_cmd[@]}" add
then
  summary_lines+=("add-default-directory: rsx add failed")
  overall_status=1
elif [[ ! -f "$add_default_dir_project_dir/src/custom-expressions/myExpr.ts" ]]; then
  printf 'add-default-directory: file not created in configured defaultDirectory.\n'
  summary_lines+=("add-default-directory: file not in configured defaultDirectory")
  overall_status=1
else
  summary_lines+=("add-default-directory: pass")
fi

printf '\n== add-search-roots ==\n'
create_add_search_roots_project "$add_search_roots_project_dir"
# Input: name, source (default), no-kebab, dir (accept default = src/expressions, which is empty),
#        mode 3 (update-existing), keepModel (default Y), file 1 (first from fallback search)
if ! run_step_in_dir_with_input "add-search-roots" "rsx add" "$add_search_roots_project_dir" "$base_dir/add-search-roots.log" \
  $'newExpr\n\nn\n\n3\n\n1\n' \
  "${rsx_cmd[@]}" add
then
  summary_lines+=("add-search-roots: rsx add failed")
  overall_status=1
elif ! grep -q 'custom-root/expressions/existing.expression.ts' "$base_dir/add-search-roots.log"; then
  printf 'add-search-roots: file from configured searchRoot not found in fallback search.\n'
  printf 'Log output:\n'
  cat "$base_dir/add-search-roots.log"
  summary_lines+=("add-search-roots: searchRoot file not listed")
  overall_status=1
else
  summary_lines+=("add-search-roots: pass")
fi

run_framework_init_case \
  "init-react" \
  "$react_init_dir" \
  "@rs-x/react" \
  "src/main.tsx" \
  create_react_project \
  "await initRsx();" \
  "createRoot(document.getElementById('root')!).render(<App />);"

run_framework_init_case \
  "init-next" \
  "$next_init_dir" \
  "@rs-x/react" \
  "app/layout.tsx" \
  create_next_project \
  "<RsxBootstrapGate>" \
  "className=\"app-shell\""

run_framework_init_case \
  "init-next-pages" \
  "$base_dir/next-pages-init-verify" \
  "@rs-x/react" \
  "pages/_app.tsx" \
  create_next_pages_project \
  "<RsxBootstrapGate>" \
  "data-shell=\"true\""

run_framework_init_case \
  "init-vue" \
  "$vue_init_dir" \
  "@rs-x/vue" \
  "src/main.ts" \
  create_vue_project \
  "await initRsx();" \
  "createApp(App).mount('#app');"

run_framework_init_case \
  "init-angular" \
  "$angular_init_dir" \
  "@rs-x/angular" \
  "src/main.ts" \
  create_angular_project \
  "providexRsx" \
  "bootstrapApplication(AppComponent, {"

verify_bootstrap_custom_paths() {
  local label="$1"
  local bootstrap_file="$2"
  local expected_compiled_dir="$3"
  local expected_preparse_dir="$4"

  if [[ ! -f "$bootstrap_file" ]]; then
    printf '%s: rsx-bootstrap.ts was not created at %s.\n' "$label" "$bootstrap_file"
    return 1
  fi
  if ! grep -qF "'${expected_compiled_dir}' + 'rsx-aot-compiled.generated'" "$bootstrap_file"; then
    printf '%s: rsx-bootstrap.ts does not use configured compiledFile path (expected %s).\n' "$label" "$expected_compiled_dir"
    printf 'Contents:\n'
    cat "$bootstrap_file"
    return 1
  fi
  if ! grep -qF "'${expected_preparse_dir}' + 'rsx-aot-preparsed.generated'" "$bootstrap_file"; then
    printf '%s: rsx-bootstrap.ts does not use configured preparseFile path (expected %s).\n' "$label" "$expected_preparse_dir"
    return 1
  fi
  if ! grep -qF '/* @vite-ignore */' "$bootstrap_file"; then
    printf '%s: rsx-bootstrap.ts does not suppress Vite dynamic import analysis.\n' "$label"
    return 1
  fi
  return 0
}

printf '\n== init-react-custom-paths ==\n'
create_react_custom_paths_project "$react_custom_paths_dir"
if ! run_step_in_dir "init-react-custom-paths" "rsx init" "$react_custom_paths_dir" "$base_dir/init-react-custom-paths.log" \
  "${rsx_cmd[@]}" init --pm "$pm" "$tag_flag" "$skip_vscode_flag" --entry src/main.tsx
then
  summary_lines+=("init-react-custom-paths: init failed")
  overall_status=1
elif ! verify_bootstrap_custom_paths "init-react-custom-paths" \
  "$react_custom_paths_dir/src/rsx-bootstrap.ts" \
  "../dist/rsx-generated/" "../dist/rsx-generated/"; then
  summary_lines+=("init-react-custom-paths: wrong bootstrap import paths")
  overall_status=1
else
  summary_lines+=("init-react-custom-paths: pass")
fi

printf '\n== init-vue-custom-paths ==\n'
create_vue_custom_paths_project "$vue_custom_paths_dir"
if ! run_step_in_dir "init-vue-custom-paths" "rsx init" "$vue_custom_paths_dir" "$base_dir/init-vue-custom-paths.log" \
  "${rsx_cmd[@]}" init --pm "$pm" "$tag_flag" "$skip_vscode_flag" --entry src/main.ts
then
  summary_lines+=("init-vue-custom-paths: init failed")
  overall_status=1
elif ! verify_bootstrap_custom_paths "init-vue-custom-paths" \
  "$vue_custom_paths_dir/src/rsx-bootstrap.ts" \
  "../dist/rsx-generated/" "../dist/rsx-generated/"; then
  summary_lines+=("init-vue-custom-paths: wrong bootstrap import paths")
  overall_status=1
else
  summary_lines+=("init-vue-custom-paths: pass")
fi

printf '\n== init-next-custom-paths ==\n'
create_next_custom_paths_project "$next_custom_paths_dir"
if ! run_step_in_dir "init-next-custom-paths" "rsx init" "$next_custom_paths_dir" "$base_dir/init-next-custom-paths.log" \
  "${rsx_cmd[@]}" init --pm "$pm" "$tag_flag" "$skip_vscode_flag" --entry app/layout.tsx
then
  summary_lines+=("init-next-custom-paths: init failed")
  overall_status=1
elif ! verify_bootstrap_custom_paths "init-next-custom-paths" \
  "$next_custom_paths_dir/app/rsx-bootstrap.ts" \
  "../dist/rsx-generated/" "../dist/rsx-generated/"; then
  summary_lines+=("init-next-custom-paths: wrong bootstrap import paths")
  overall_status=1
else
  summary_lines+=("init-next-custom-paths: pass")
fi

printf '\n== init-angular-custom-paths ==\n'
create_angular_custom_paths_project "$angular_custom_paths_dir"
if ! run_step_in_dir "init-angular-custom-paths" "rsx init" "$angular_custom_paths_dir" "$base_dir/init-angular-custom-paths.log" \
  "${rsx_cmd[@]}" init --pm "$pm" "$tag_flag" "$skip_vscode_flag" --entry src/main.ts
then
  summary_lines+=("init-angular-custom-paths: init failed")
  overall_status=1
elif ! node -e "
const fs = require('node:fs');
const angularJson = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const buildOptions = angularJson.projects?.app?.architect?.build?.options ?? {};
if (buildOptions.browser !== 'dist/rsx-generated/rsx-angular-browser-entry.generated.ts') {
  console.error('angular.json browser is not wired to the generated RS-X wrapper.');
  console.error('browser:', buildOptions.browser);
  process.exit(1);
}
if (Array.isArray(buildOptions.polyfills) && buildOptions.polyfills.length > 0) {
  console.error('angular.json polyfills should not contain RS-X registration wiring.');
  console.error('polyfills:', buildOptions.polyfills);
  process.exit(1);
}
const wrapperContents = fs.readFileSync(process.argv[2], 'utf8');
if (!wrapperContents.includes(\"import './rsx-aot-registration.generated';\")) {
  console.error('wrapper does not contain configured registrationFile import.');
  console.error('Contents:', wrapperContents);
  process.exit(1);
}
if (!wrapperContents.includes(\"import '../../src/main';\")) {
  console.error('wrapper does not import the original Angular browser entry.');
  console.error('Contents:', wrapperContents);
  process.exit(1);
}
const mainTs = fs.readFileSync(process.argv[3], 'utf8');
if (mainTs.includes('custom-registration')) {
  console.error('main.ts should not be rewritten with the configured registrationFile import.');
  console.error('Contents:', mainTs);
  process.exit(1);
}
" "$angular_custom_paths_dir/angular.json" "$angular_custom_paths_dir/dist/rsx-generated/rsx-angular-browser-entry.generated.ts" "$angular_custom_paths_dir/src/main.ts"; then
  summary_lines+=("init-angular-custom-paths: Angular wrapper wiring incorrect")
  overall_status=1
else
  summary_lines+=("init-angular-custom-paths: pass")
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

printf '\n== init ==\n'
if ! run_step "init" "smoke" "$base_dir/init-smoke.log" \
  env RSX_SETUP_VERIFY_DIR="$setup_smoke_dir" RSX_PM="$pm" RSX_TAG_FLAG="$tag_flag" RSX_SKIP_VSCODE_FLAG="$skip_vscode_flag" \
  zsh "$script_dir/verify-rsx-setup.sh"
then
  summary_lines+=("init: failed")
  overall_status=1
else
  summary_lines+=("init: pass")
fi

printf '\nSummary\n'
for line in "${summary_lines[@]}"; do
  printf '  %s\n' "$line"
done

exit "$overall_status"
