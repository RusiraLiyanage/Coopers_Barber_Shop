#!/bin/sh
# Stop immediately when cleanup fails or an expected variable is missing.
set -eu

# The deploy workflow downloads the ECS task definition beside the app folder.
TASK_DEFINITION_FILE="../task-definition.json"

# Fail clearly if the workflow did not download the ECS task definition first.
if [ ! -f "$TASK_DEFINITION_FILE" ]; then
  # Print the missing file path to stderr so the GitHub Actions log is useful.
  echo "Task definition file not found: $TASK_DEFINITION_FILE" >&2
  # Return a non-zero status so deployment stops before registering bad input.
  exit 1
fi

# Remove AWS-managed fields that cannot be submitted in a new task revision.
jq 'del(.compatibilities, .taskDefinitionArn, .requiresAttributes, .revision, .status, .registeredAt, .registeredBy)' "$TASK_DEFINITION_FILE" > tmp.json
# Replace the downloaded task definition with the cleaned version.
mv tmp.json "$TASK_DEFINITION_FILE"

# Confirm the cleanup completed for the deployment log.
echo "Task definition cleaned successfully."
