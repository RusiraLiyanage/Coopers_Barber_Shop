#!/bin/sh
# This script runs inside the production Docker container for this NestJS app.
# Stop immediately if a command fails or an expected variable is missing.
set -eu

# Most backend apps compile their NestJS entrypoint to dist/main.js.
if [ -f "dist/main.js" ]; then
  # Replace the shell process with the Node process for proper container signals.
  exec node dist/main.js
fi

# booking-api currently compiles to dist/src/main.js, so support that layout too.
if [ -f "dist/src/main.js" ]; then
  # Replace the shell process with the Node process for proper container signals.
  exec node dist/src/main.js
fi

# Fail loudly if the Docker image was built without a compiled NestJS entrypoint.
echo "Unable to find compiled NestJS entrypoint." >&2
# Return a non-zero code so ECS marks the container start as failed.
exit 1
