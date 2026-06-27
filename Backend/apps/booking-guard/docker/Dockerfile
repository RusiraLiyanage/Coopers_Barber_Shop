# Use a small Node image as the shared base for build and runtime stages.
FROM node:22-alpine AS base

# Package name used by Turborepo to select the app being containerized.
ARG APP_NAME
# Workspace folder for the selected app inside the backend monorepo.
ARG APP_FOLDER
# Container port exposed by the selected ECS service.
ARG SERVICE_PORT=8080
# PNPM version pinned to the backend workspace package manager version.
ARG PNPM_VERSION=10.17.1

# Persist the selected app folder so later Docker stages can reference it.
ENV ENV_APP_FOLDER=${APP_FOLDER}
# Persist the selected service port so the runtime stage can expose it.
ENV ENV_SERVICE_PORT=${SERVICE_PORT}

# Create a build stage with PNPM and OS packages needed during install/build.
FROM base AS pnpm-setup
# Install shell, certificates, compatibility libraries, and OpenSSL for Node deps.
RUN apk add --no-cache bash ca-certificates libc6-compat openssl
# Enable Corepack and activate the PNPM version used by this workspace.
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Create a pruned monorepo containing only this app and its dependencies.
FROM pnpm-setup AS pruner
# Re-declare APP_NAME because Docker ARG scope does not cross stages.
ARG APP_NAME
# Use /app as the build workspace inside the container.
WORKDIR /app
# Copy the backend monorepo into the pruning stage.
COPY . .
# Generate a Docker-friendly pruned workspace for the selected app.
RUN pnpm dlx turbo prune "${APP_NAME}" --docker

# Install dependencies and build the selected app from the pruned workspace.
FROM pnpm-setup AS installer
# Re-declare APP_NAME so the build command can filter the selected app.
ARG APP_NAME
# Use /app as the install/build workspace inside the container.
WORKDIR /app
# Copy only package metadata first so Docker can cache dependency installation.
COPY --from=pruner /app/out/json/ .
# Copy workspace config required by PNPM in the pruned workspace.
COPY --from=pruner /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
# Install exact dependencies from the lockfile for reproducible builds.
RUN pnpm install --frozen-lockfile

# Copy the full pruned source after dependencies are installed.
COPY --from=pruner /app/out/full/ .
# Build the selected app and any required internal packages.
RUN pnpm turbo run build --filter="${APP_NAME}"

# Create the smaller runtime image that ECS will actually run.
FROM base AS runner
# Use a stable runtime working directory.
WORKDIR /usr/src/app
# Install runtime shell/cert/OpenSSL dependencies used by the app and scripts.
RUN apk add --no-cache bash ca-certificates openssl

# Copy the built pruned workspace from the installer stage.
COPY --from=installer /app .

# Ensure the app-specific startup script can be executed.
RUN chmod +x "./${ENV_APP_FOLDER}/docker/start.sh"

# Document the port exposed by this container for ECS/task definitions.
EXPOSE ${ENV_SERVICE_PORT}

# Start inside the selected app folder and run its production startup script.
CMD ["sh", "-c", "cd ./${ENV_APP_FOLDER} && ./docker/start.sh"]
