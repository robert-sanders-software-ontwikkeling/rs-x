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
default_base_dir="$package_root/.tests/rsx-setup-smoke"
prebuild_script="$script_dir/prepare-local-rsx-packages.sh"

base_dir="${RSX_SETUP_VERIFY_DIR:-$default_base_dir}"
work_base_dir="${RSX_SETUP_WORK_DIR:-$base_dir/workspace}"
pm="${RSX_PM:-npm}"
tag_flag="${RSX_TAG_FLAG:---next}"
skip_vscode_flag="${RSX_SKIP_VSCODE_FLAG:---skip-vscode}"

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

run_step() {
  local framework="$1"
  local step_name="$2"
  local log_file="$3"
  shift 3

  printf '%s: %s...\n' "$framework" "$step_name"
  if ! run_in_log "$log_file" "$@"; then
    printf '%s: %s failed.\n' "$framework" "$step_name"
    print_log_tail "$log_file"
    return 1
  fi

  return 0
}

run_step_in_dir() {
  local framework="$1"
  local step_name="$2"
  local project_dir="$3"
  local log_file="$4"
  shift 4

  printf '%s: %s...\n' "$framework" "$step_name"
  if ! run_in_dir_log "$project_dir" "$log_file" "$@"; then
    printf '%s: %s failed.\n' "$framework" "$step_name"
    print_log_tail "$log_file"
    return 1
  fi

  return 0
}

rm -rf "$base_dir"
mkdir -p "$base_dir"
mkdir -p "$work_base_dir"
cat > "$work_base_dir/package.json" <<'EOF'
{
  "name": "rsx-setup-smoke-workspace",
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

verify_framework() {
  local framework="$1"
  local project_name="rsx-setup-${framework}-verify"
  local project_dir="$work_base_dir/$project_name"
  local project_arg="./$project_name"
  local scaffold_log="$base_dir/${framework}-scaffold.log"
  local install_log="$base_dir/${framework}-install.log"
  local setup_log="$base_dir/${framework}-setup.log"
  local setup_repeat_log="$base_dir/${framework}-setup-repeat.log"
  local build_log="$base_dir/${framework}-build.log"

  rm -rf "$project_dir"

  printf '\n== %s ==\n' "$framework"

  case "$framework" in
    angular)
      run_step_in_dir "$framework" "scaffold" "$work_base_dir" "$scaffold_log" \
        npx @angular/cli@latest new "$project_name" --directory "$project_arg" --style css --routing --skip-git --skip-install --defaults \
        || { summary_lines+=("$framework: scaffold failed"); overall_status=1; return; }
      run_step_in_dir "$framework" "install" "$project_dir" "$install_log" "$pm" install \
        || { summary_lines+=("$framework: install failed"); overall_status=1; return; }
      ;;
    react)
      run_step_in_dir "$framework" "scaffold" "$work_base_dir" "$scaffold_log" \
        npx create-vite@latest "$project_arg" --no-interactive --template react-ts \
        || { summary_lines+=("$framework: scaffold failed"); overall_status=1; return; }
      run_step_in_dir "$framework" "install" "$project_dir" "$install_log" "$pm" install \
        || { summary_lines+=("$framework: install failed"); overall_status=1; return; }
      ;;
    vue)
      run_step_in_dir "$framework" "scaffold" "$work_base_dir" "$scaffold_log" \
        npx create-vite@latest "$project_arg" --no-interactive --template vue-ts \
        || { summary_lines+=("$framework: scaffold failed"); overall_status=1; return; }
      run_step_in_dir "$framework" "install" "$project_dir" "$install_log" "$pm" install \
        || { summary_lines+=("$framework: install failed"); overall_status=1; return; }
      ;;
    next)
      run_step_in_dir "$framework" "scaffold" "$work_base_dir" "$scaffold_log" \
        npx create-next-app@latest "$project_arg" --ts --app --empty --use-npm --yes --disable-git \
        || { summary_lines+=("$framework: scaffold failed"); overall_status=1; return; }
      ;;
    *)
      printf 'Unknown framework: %s\n' "$framework"
      summary_lines+=("$framework: unsupported")
      overall_status=1
      return
      ;;
  esac

  run_step_in_dir "$framework" "rsx setup" "$project_dir" "$setup_log" "${rsx_cmd[@]}" setup --pm "$pm" "$tag_flag" "$skip_vscode_flag" \
    || { summary_lines+=("$framework: rsx setup failed"); overall_status=1; return; }

  run_step_in_dir "$framework" "rsx setup (repeat)" "$project_dir" "$setup_repeat_log" "${rsx_cmd[@]}" setup --pm "$pm" "$tag_flag" "$skip_vscode_flag" \
    || { summary_lines+=("$framework: repeat rsx setup failed"); overall_status=1; return; }

  run_step_in_dir "$framework" "build" "$project_dir" "$build_log" "$pm" run build \
    || { summary_lines+=("$framework: build failed"); overall_status=1; return; }

  printf '%s: build passed.\n' "$framework"
  summary_lines+=("$framework: pass")
}

cd "$base_dir" || exit 1
verify_framework angular
verify_framework react
verify_framework vue
verify_framework next

printf '\nSummary\n'
for line in "${summary_lines[@]}"; do
  printf '  %s\n' "$line"
done

exit "$overall_status"
