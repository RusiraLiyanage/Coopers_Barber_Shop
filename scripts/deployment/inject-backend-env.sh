#!/usr/bin/env bash
# Inject AppConfig-generated backend env values into ECS task definitions.
set -euo pipefail

TASK_FILE="${1:?Usage: inject-backend-env.sh <task-definition.json> <container-name> <env-file>}"
CONTAINER_NAME="${2:?Usage: inject-backend-env.sh <task-definition.json> <container-name> <env-file>}"
ENV_FILE="${3:?Usage: inject-backend-env.sh <task-definition.json> <container-name> <env-file>}"

if [ ! -f "$TASK_FILE" ]; then
  echo "Task definition not found: $TASK_FILE" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

ENV_JSON='[]'

while IFS= read -r line || [ -n "$line" ]; do
  if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
    key="${line%%=*}"
    value="${line#*=}"

    ENV_JSON="$(
      jq \
        --arg name "$key" \
        --arg value "$value" \
        '. + [{ name: $name, value: $value }]' \
        <<< "$ENV_JSON"
    )"
  fi
done < "$ENV_FILE"

TMP_FILE="$(mktemp)"
cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

jq \
  --arg container "$CONTAINER_NAME" \
  --argjson appEnv "$ENV_JSON" \
  '
    .containerDefinitions |= map(
      if .name == $container then
        ((.secrets // []) | map(.name)) as $secretNames
        | ($appEnv | map(select(.name as $name | ($secretNames | index($name) | not)))) as $safeAppEnv
        | ($safeAppEnv | map(.name)) as $safeAppNames
        | .environment =
          (((.environment // []) | map(select(.name as $name | ($safeAppNames | index($name) | not))))
          + $safeAppEnv)
      else
        .
      end
    )
  ' \
  "$TASK_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$TASK_FILE"

echo "Injected backend env from $ENV_FILE into $TASK_FILE"
