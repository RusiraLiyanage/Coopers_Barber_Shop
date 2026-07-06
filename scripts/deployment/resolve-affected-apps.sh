#!/usr/bin/env bash
# Resolve which apps should deploy for a push, based on changed file paths.
set -euo pipefail

# The deployment environment selects config/staging-map.json or config/production-map.json.
ENVIRONMENT="${1:?Usage: resolve-affected-apps.sh <staging|production> <before-sha> <after-sha> [manual-app-key]}"
# The previous commit SHA comes from the GitHub push event.
BEFORE_SHA="${2:?Usage: resolve-affected-apps.sh <staging|production> <before-sha> <after-sha> [manual-app-key]}"
# The current commit SHA comes from the GitHub push event.
AFTER_SHA="${3:?Usage: resolve-affected-apps.sh <staging|production> <before-sha> <after-sha> [manual-app-key]}"
# Manual workflow dispatch can pass one app key or all.
MANUAL_APP_KEY="${4:-}"
# Map file naming follows the selected environment.
MAP_FILE="config/$ENVIRONMENT-map.json"

# Fail early when the environment map has not been created.
if [ ! -f "$MAP_FILE" ]; then
  echo "Deployment map not found: $MAP_FILE" >&2
  exit 1
fi

# Return all app keys from the selected deployment map.
all_apps() {
  jq -c 'keys' "$MAP_FILE"
}

# Manual dispatch with all deploys every mapped app.
if [ "$MANUAL_APP_KEY" = "all" ]; then
  all_apps
  exit 0
fi

# Manual dispatch with one app bypasses changed-file detection.
if [ -n "$MANUAL_APP_KEY" ]; then
  jq -e --arg app "$MANUAL_APP_KEY" 'has($app)' "$MAP_FILE" >/dev/null
  jq -c -n --arg app "$MANUAL_APP_KEY" '[$app]'
  exit 0
fi

# First push to a branch can have an all-zero before SHA; compare with the previous commit when possible.
if [[ "$BEFORE_SHA" =~ ^0+$ ]]; then
  if git rev-parse "$AFTER_SHA^" >/dev/null 2>&1; then
    BEFORE_SHA="$AFTER_SHA^"
  else
    all_apps
    exit 0
  fi
fi

# Read changed files between the previous and current commit.
CHANGED_FILES=()
while IFS= read -r changed_file; do
  CHANGED_FILES+=("$changed_file")
done < <(git diff --name-only "$BEFORE_SHA" "$AFTER_SHA")

# No changed files means there is nothing to deploy.
if [ "${#CHANGED_FILES[@]}" -eq 0 ]; then
  echo "[]"
  exit 0
fi

# Shared backend changes affect every backend app.
BACKEND_SHARED_CHANGED=false
# Frontend runtime injection changes affect only frontend apps.
FRONTEND_DEPLOYMENT_CHANGED=false
# Deployment workflow/config changes affect every mapped app.
DEPLOYMENT_CHANGED=false

for changed_file in "${CHANGED_FILES[@]}"; do
  case "$changed_file" in
    Backend/packages/*|Backend/package.json|Backend/pnpm-lock.yaml|Backend/turbo.json|Backend/.dockerignore)
      BACKEND_SHARED_CHANGED=true
      ;;
    scripts/deployment/inject-frontend-runtime-env.sh)
      FRONTEND_DEPLOYMENT_CHANGED=true
      ;;
    scripts/deployment/resolve-affected-apps.sh)
      ;;
    config/*|scripts/deployment/*|.github/workflows/*)
      DEPLOYMENT_CHANGED=true
      ;;
  esac
done

# If deployment wiring changed, redeploy all apps so ECS receives the new build/deploy behavior.
if [ "$DEPLOYMENT_CHANGED" = "true" ]; then
  all_apps
  exit 0
fi

# Build a JSON array of app keys whose work_directory changed.
jq -c -n \
  --argjson map "$(cat "$MAP_FILE")" \
  --argjson backendShared "$BACKEND_SHARED_CHANGED" \
  --argjson frontendDeployment "$FRONTEND_DEPLOYMENT_CHANGED" \
  '
    $map
    | to_entries
    | map(
        . as $entry
        | select(
            any($ARGS.positional[]; startswith($entry.value.work_directory + "/"))
            or (
              $backendShared
              and ($entry.value.work_directory | startswith("Backend/apps/"))
            )
            or (
              $frontendDeployment
              and ($entry.value.work_directory | startswith("Frontend/"))
            )
          )
        | $entry.key
      )
    | unique
  ' --args "${CHANGED_FILES[@]}"
