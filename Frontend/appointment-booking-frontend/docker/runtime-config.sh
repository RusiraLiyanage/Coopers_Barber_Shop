#!/bin/sh
set -eu

escape_js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__COOPERS_RUNTIME_CONFIG__ = Object.freeze({
  VITE_API_URL: "$(escape_js_string "${VITE_API_URL:-http://localhost:7311}")"
});
EOF
