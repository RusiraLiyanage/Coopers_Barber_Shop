#!/usr/bin/env bash
# Pull common and service-specific configuration from AWS AppConfig.
set -euo pipefail

# The deploy environment must be explicit so staging and production never mix.
ENVIRONMENT="${ENV:?ENV must be set to staging or production}"
# The AWS region must be explicit because AppConfig resources are regional.
AWS_REGION="${AWS_REGION:?AWS_REGION must be set}"
# The app directory contains package.json and .awsConfVer.yaml.
APP_DIRECTORY="${1:?Usage: process-env.sh <app-directory> [output-file]}"
# Common config is shared across services, matching the Backend-Services pattern.
COMMON_CONFIG_NAME="${COMMON_CONFIG_NAME:-common.coopers}"
# Use an optional explicit service config name, otherwise read package.json name.
SERVICE_CONFIG_NAME="${SERVICE_CONFIG_NAME:-}"
# Export pulled values to GitHub Actions when requested by workflow steps.
EXPORT_TO_GITHUB_ENV="${EXPORT_TO_GITHUB_ENV:-false}"

# Resolve all paths from the current repository root.
APP_DIRECTORY="$(cd "$APP_DIRECTORY" && pwd)"
# Each app owns its AppConfig version pointers.
AWS_CONFIG_FILE_PATH="$APP_DIRECTORY/.awsConfVer.yaml"
# Default output matches the backend runtime config loader: .env.staging/.env.production.
OUTPUT_FILE="${2:-$APP_DIRECTORY/.env.$ENVIRONMENT}"
# Temporary files keep raw AppConfig YAML separate from the generated env file.
COMMON_CONFIG_FILE="$(mktemp)"
SERVICE_CONFIG_FILE="$(mktemp)"

# Remove temporary files even when the script fails.
cleanup() {
  rm -f "$COMMON_CONFIG_FILE" "$SERVICE_CONFIG_FILE"
}
trap cleanup EXIT

# Fail early when the app has not been prepared for AppConfig-backed deployment.
if [ ! -f "$AWS_CONFIG_FILE_PATH" ]; then
  echo "Missing AppConfig version file: $AWS_CONFIG_FILE_PATH" >&2
  exit 1
fi

# Extract one version number from the simple .awsConfVer.yaml structure.
read_config_version() {
  local section="$1"
  awk -v section="$section" -v env="$ENVIRONMENT" '
    $1 == section ":" { in_section = 1; next }
    /^[^[:space:]].*:/ { in_section = 0 }
    in_section && $1 == env ":" { print $2; exit }
  ' "$AWS_CONFIG_FILE_PATH"
}

# Resolve an AppConfig application ID by human-readable application name.
get_application_id() {
  local app_name="$1"
  aws appconfig list-applications \
    --region "$AWS_REGION" \
    | jq -r ".Items[] | select(.Name == \"$app_name\") | .Id"
}

# Resolve an environment-specific configuration profile ID.
get_profile_id() {
  local application_id="$1"
  local config_name="$2"
  aws appconfig list-configuration-profiles \
    --region "$AWS_REGION" \
    --application-id "$application_id" \
    | jq -r ".Items[] | select(.Name == \"$config_name.$ENVIRONMENT\") | .Id"
}

# Download one hosted configuration version from AppConfig.
fetch_app_config() {
  local config_name="$1"
  local version="$2"
  local output_file="$3"
  local application_id
  local profile_id

  application_id="$(get_application_id "$config_name")"
  if [ -z "$application_id" ] || [ "$application_id" = "null" ]; then
    echo "No AppConfig application found for $config_name" >&2
    exit 1
  fi

  profile_id="$(get_profile_id "$application_id" "$config_name")"
  if [ -z "$profile_id" ] || [ "$profile_id" = "null" ]; then
    echo "No AppConfig profile found for $config_name.$ENVIRONMENT" >&2
    exit 1
  fi

  aws appconfig get-hosted-configuration-version \
    --region "$AWS_REGION" \
    --application-id "$application_id" \
    --configuration-profile-id "$profile_id" \
    --version-number "$version" \
    "$output_file" >/dev/null
}

# Convert simple YAML key-value lines from AppConfig into .env format.
append_yaml_to_env() {
  local input_file="$1"
  local env_file="$2"

  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*: ]]; then
      local key
      local value
      key="$(echo "$line" | cut -d ':' -f 1)"
      value="$(echo "$line" | cut -d ':' -f 2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      echo "$key=$value" >> "$env_file"
    fi
  done < "$input_file"
}

# Export generated env values to GITHUB_ENV for build-time consumers like Vite.
append_env_to_github_env() {
  local env_file="$1"

  if [ "$EXPORT_TO_GITHUB_ENV" != "true" ]; then
    return
  fi

  if [ -z "${GITHUB_ENV:-}" ]; then
    echo "EXPORT_TO_GITHUB_ENV=true but GITHUB_ENV is not available." >&2
    exit 1
  fi

  cat "$env_file" >> "$GITHUB_ENV"
}

# Service config defaults to the package name, which is how Backend-Services identifies apps.
if [ -z "$SERVICE_CONFIG_NAME" ]; then
  SERVICE_CONFIG_NAME="$(jq -r '.name' "$APP_DIRECTORY/package.json")"
fi

COMMON_CONF_VERSION="$(read_config_version commonConfVersion)"
SERVICE_CONF_VERSION="$(read_config_version serviceConfVersion)"

if [ -z "$COMMON_CONF_VERSION" ] || [ -z "$SERVICE_CONF_VERSION" ]; then
  echo "Missing AppConfig version for $ENVIRONMENT in $AWS_CONFIG_FILE_PATH" >&2
  exit 1
fi

# Recreate the env file so old config values cannot survive between deployments.
rm -f "$OUTPUT_FILE"
touch "$OUTPUT_FILE"

fetch_app_config "$COMMON_CONFIG_NAME" "$COMMON_CONF_VERSION" "$COMMON_CONFIG_FILE"
fetch_app_config "$SERVICE_CONFIG_NAME" "$SERVICE_CONF_VERSION" "$SERVICE_CONFIG_FILE"

append_yaml_to_env "$COMMON_CONFIG_FILE" "$OUTPUT_FILE"
append_yaml_to_env "$SERVICE_CONFIG_FILE" "$OUTPUT_FILE"

echo "COMMON_CONF_VERSION=$COMMON_CONF_VERSION" >> "$OUTPUT_FILE"
echo "SERVICE_CONF_VERSION=$SERVICE_CONF_VERSION" >> "$OUTPUT_FILE"
echo "ENV=$ENVIRONMENT" >> "$OUTPUT_FILE"

append_env_to_github_env "$OUTPUT_FILE"

echo "Configuration saved to $OUTPUT_FILE"

