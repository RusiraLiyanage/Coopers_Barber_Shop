#!/usr/bin/env bash
# Remove AWS-managed ECS task definition fields before rendering a new revision.
set -euo pipefail

# The workflow downloads the current task definition to this file path.
TASK_DEFINITION_FILE="${1:?Usage: task-def-clean.sh <task-definition-file>}"

# Fail early if the describe-task-definition step did not produce a file.
if [ ! -f "$TASK_DEFINITION_FILE" ]; then
  echo "Task definition file not found: $TASK_DEFINITION_FILE" >&2
  exit 1
fi

# Delete fields that AWS returns but does not allow when registering a new revision.
jq 'del(
  .compatibilities,
  .taskDefinitionArn,
  .requiresAttributes,
  .revision,
  .status,
  .registeredAt,
  .registeredBy
)' "$TASK_DEFINITION_FILE" > "$TASK_DEFINITION_FILE.tmp"

# Replace the original file with the cleaned version used by the ECS render action.
mv "$TASK_DEFINITION_FILE.tmp" "$TASK_DEFINITION_FILE"

echo "Task definition cleaned: $TASK_DEFINITION_FILE"

