# Deployment Maps

These JSON files describe how each deployable app maps to AWS deployment resources.

JSON does not support comments, so the field explanations live here instead of inside `staging-map.json` and `production-map.json`.

## Files

- `staging-map.json` is used when deploying the staging environment.
- `production-map.json` is used when deploying the production environment.

## Fields

- `ecr_repo`: Amazon ECR repository where the Docker image is pushed.
- `ecs_service`: Amazon ECS service that should receive the new task definition.
- `ecs_cluster`: Amazon ECS cluster that owns the service.
- `ecs_task_name`: ECS task definition family name to download before rendering the new image.
- `container_name`: Container name inside the ECS task definition that should receive the new image.
- `node_version`: Node.js version used by GitHub Actions setup steps.
- `work_directory`: App directory used for task definition cleanup and app-level config.
- `docker_context`: Docker build context passed to `docker build`.
- `dockerfile`: Dockerfile path passed to `docker build`.
- `app_name`: Backend package name passed into the monorepo Docker build.
- `app_folder`: Backend app folder inside the `Backend` Docker context.
- `container_port`: Internal container port exposed by the app.

## Flow

The workflow reads the map for the selected environment, exports the selected app entry into GitHub Actions environment variables, builds the Docker image, pushes it to ECR, renders the ECS task definition with the new image, then deploys it to the configured ECS service.

