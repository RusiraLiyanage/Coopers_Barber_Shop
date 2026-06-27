#!/usr/bin/env bash
# Validate deployment map JSON before workflows depend on it.
set -euo pipefail

# Check both environment maps by default, or any files passed as arguments.
CONFIG_FILES=("$@")
if [ "${#CONFIG_FILES[@]}" -eq 0 ]; then
  CONFIG_FILES=("config/staging-map.json" "config/production-map.json")
fi

for config_file in "${CONFIG_FILES[@]}"; do
  jq -e '
    to_entries
    | all(
      .value.ecr_repo
      and .value.ecs_service
      and .value.ecs_cluster
      and .value.ecs_task_name
      and .value.container_name
      and .value.node_version
      and .value.work_directory
      and .value.docker_context
      and .value.dockerfile
      and .value.container_port
    )
  ' "$config_file" >/dev/null
  echo "Valid deployment map: $config_file"
done

