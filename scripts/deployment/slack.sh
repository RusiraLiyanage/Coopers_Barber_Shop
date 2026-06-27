#!/usr/bin/env bash
# Send a deployment result message to Slack from GitHub Actions.
set -euo pipefail

# Slack webhook is stored in GitHub Secrets, never in the repository.
SLACK_WEBHOOK_URL="${1:?Slack webhook URL is required}"
# Service name is the logical deployment key, for example coopers.booking.api.
SERVICE_NAME="${2:?Service name is required}"
# Environment is staging or production.
ENVIRONMENT="${3:?Environment is required}"
# Status is usually success, failure, or cancelled from the workflow result.
STATUS="${4:?Status is required}"

if [ "$STATUS" = "success" ]; then
  MESSAGE="Build Success"
  ICON=":tada:"
else
  MESSAGE="Build Failure"
  ICON=":boom:"
fi

curl -fsS -X POST \
  -H 'Content-type: application/json' \
  --data "{
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"$ICON *$MESSAGE* $ICON\"
        },
        \"fields\": [
          {
            \"type\": \"mrkdwn\",
            \"text\": \"*Service:*\\n$SERVICE_NAME\"
          },
          {
            \"type\": \"mrkdwn\",
            \"text\": \"*Environment:*\\n$ENVIRONMENT\"
          },
          {
            \"type\": \"mrkdwn\",
            \"text\": \"*Status:*\\n$STATUS\"
          }
        ]
      }
    ]
  }" \
  "$SLACK_WEBHOOK_URL"

