#!/usr/bin/env bash
# Read one app entry from an environment deployment map and export it for GitHub Actions.
set -euo pipefail

# The deployment environment selects config/staging-map.json or config/production-map.json.
ENVIRONMENT="${1:?Usage: resolve-deploy-payload.sh <staging|production> <app-key>}"
# The app key is the top-level JSON key, for example coopers.booking.api.
APP_KEY="${2:?Usage: resolve-deploy-payload.sh <staging|production> <app-key>}"
# Map file naming follows the selected environment.
MAP_FILE="config/$ENVIRONMENT-map.json"

# Fail early when the environment map has not been created.
if [ ! -f "$MAP_FILE" ]; then
  echo "Deployment map not found: $MAP_FILE" >&2
  exit 1
fi

# Extract the selected app payload as compact JSON.
DEPLOY_PAYLOAD="$(jq -c --arg app "$APP_KEY" '.[$app]' "$MAP_FILE")"

# jq returns null when the app key does not exist.
if [ "$DEPLOY_PAYLOAD" = "null" ]; then
  echo "App key $APP_KEY was not found in $MAP_FILE" >&2
  exit 1
fi

# Export the app key for readable logging and Slack messages.
echo "APP_KEY=$APP_KEY" >> "$GITHUB_ENV"
# Export each JSON field as a GitHub Actions environment variable and step output.
while IFS='=' read -r key value; do
  echo "$key=$value" >> "$GITHUB_ENV"
  echo "$key=$value" >> "$GITHUB_OUTPUT"
done < <(echo "$DEPLOY_PAYLOAD" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')
# Save the raw JSON as a step output for debugging or downstream jobs.
echo "deploy_payload=$DEPLOY_PAYLOAD" >> "$GITHUB_OUTPUT"
