# Build the customer booking frontend as a static Vite application.
FROM node:22-alpine AS build

# Keep all build commands inside a predictable working directory.
WORKDIR /app

# Select which Vite env file should be loaded, for example .env.staging or .env.production.
ARG VITE_BUILD_MODE=production

# Copy package metadata first so dependency installation can be cached by Docker.
COPY package.json package-lock.json ./

# Install exactly the dependency versions recorded in package-lock.json.
RUN npm ci

# Copy the application source after dependencies are installed.
COPY . .

# Compile TypeScript and produce the Vite dist directory for the selected environment.
RUN npm run build -- --mode "${VITE_BUILD_MODE}"

# Serve the compiled static files with Nginx in the runtime container.
FROM nginx:1.27-alpine AS runtime

# Copy the customer-specific Nginx SPA routing configuration.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the generated Vite build output into Nginx's web root.
COPY --from=build /app/dist /usr/share/nginx/html

# Document the port used by this frontend container.
EXPOSE 8910

# Run Nginx in the foreground so the container stays alive.
CMD ["nginx", "-g", "daemon off;"]
