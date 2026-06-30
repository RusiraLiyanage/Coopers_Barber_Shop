#!/bin/sh
set -eu

escape_js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/admin-console/runtime-config.js <<EOF
window.__COOPERS_RUNTIME_CONFIG__ = Object.freeze({
  VITE_API_URL: "$(escape_js_string "${VITE_API_URL:-http://localhost:7311}")",
  VITE_ADMIN_REALTIME_URL: "$(escape_js_string "${VITE_ADMIN_REALTIME_URL:-http://localhost:7313/admin/realtime}")",
  VITE_SESSION_IDLE_TIMEOUT_SECONDS: "$(escape_js_string "${VITE_SESSION_IDLE_TIMEOUT_SECONDS:-300}")",
  VITE_SESSION_EXTENSION_GRACE_SECONDS: "$(escape_js_string "${VITE_SESSION_EXTENSION_GRACE_SECONDS:-300}")"
});
EOF
