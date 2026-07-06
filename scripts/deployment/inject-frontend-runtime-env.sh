#!/usr/bin/env bash
# Inject browser runtime config values into frontend ECS task definitions.
set -euo pipefail

TASK_FILE="${1:?Usage: inject-frontend-runtime-env.sh <task-definition.json> <container-name> <app-key>}"
CONTAINER_NAME="${2:?Usage: inject-frontend-runtime-env.sh <task-definition.json> <container-name> <app-key>}"
APP_KEY="${3:?Usage: inject-frontend-runtime-env.sh <task-definition.json> <container-name> <app-key>}"

if [ ! -f "$TASK_FILE" ]; then
  echo "Task definition not found: $TASK_FILE" >&2
  exit 1
fi

case "$APP_KEY" in
  coopers.customer.frontend)
    RUNTIME_KEYS=(
      VITE_API_URL
    )
    ;;
  coopers.admin.frontend)
    RUNTIME_KEYS=(
      VITE_API_URL
      VITE_ADMIN_REALTIME_URL
    )
    ;;
  *)
    exit 0
    ;;
esac

RUNTIME_ENV_JSON='[]'

for key in "${RUNTIME_KEYS[@]}"; do
  value="${!key:-}"

  if [ "$key" = "VITE_API_URL" ] && [ -z "$value" ]; then
    echo "$key must be set before deploying $APP_KEY" >&2
    exit 1
  fi

  if [ -n "$value" ]; then
    RUNTIME_ENV_JSON="$(
      jq \
        --arg name "$key" \
        --arg value "$value" \
        '. + [{ name: $name, value: $value }]' \
        <<< "$RUNTIME_ENV_JSON"
    )"
  fi
done

TMP_FILE="$(mktemp)"
cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

jq \
  --arg container "$CONTAINER_NAME" \
  --argjson runtimeEnv "$RUNTIME_ENV_JSON" \
  '
    ($runtimeEnv | map(.name)) as $runtimeNames
    | .containerDefinitions |= map(
        if .name == $container then
          .environment =
            (((.environment // []) | map(select(.name as $name | ($runtimeNames | index($name) | not))))
            + $runtimeEnv)
        else
          .
        end
      )
  ' \
  "$TASK_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$TASK_FILE"

echo "Injected runtime env for $APP_KEY into $TASK_FILE"
