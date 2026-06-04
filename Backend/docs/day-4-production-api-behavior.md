# Day 4 - Production API Behavior

Date: 2026-06-01

## Goal

Move cross-cutting API behavior into shared backend packages so every app in the monorepo behaves consistently.

## What Changed

- Added a shared exception filter in `packages/common` so API errors return the same shape across apps.
- Added a shared validation pipe factory with whitelist, transform, and unknown-property rejection enabled.
- Added shared XSS protection middleware and wired it through Nest module middleware.
- Added shared bootstrap helpers for Helmet, CORS, validation, exception filters, Swagger, and Node crypto setup.
- Added consistent `/health` endpoints for `auth-api` and `booking-api`.
- Added shared rate limiting through `ApiRateLimitModule`.
- Added Swagger UI and OpenAPI JSON for both APIs.

## Why It Matters

Common behavior should not be duplicated inside each app. If every app configures errors, validation, security headers, health checks, rate limits, and docs separately, the system drifts over time. Moving these pieces into `packages/common` gives future backend apps the same production baseline from day one.

This is the same intuition behind company-wide backend service architecture: business apps should focus on business logic, while shared infrastructure packages provide consistent platform behavior.

## Runtime Endpoints

- Auth API Swagger UI: `http://localhost:7312/docs`
- Auth API OpenAPI JSON: `http://localhost:7312/docs-json`
- Auth API health: `http://localhost:7312/health`
- Booking API Swagger UI: `http://localhost:7310/docs`
- Booking API OpenAPI JSON: `http://localhost:7310/docs-json`
- Booking API health: `http://localhost:7310/health`

## Validation Completed

- `pnpm --filter @coopers/common build`
- `pnpm --filter @coopers/common lint`
- `pnpm --filter @coopers/auth.api build`
- `pnpm --filter @coopers/auth.api lint`
- `pnpm --filter @coopers/booking.api build`
- `pnpm --filter @coopers/booking.api exec eslint "src/**/*.ts"`
- `pnpm pre`

Runtime checks:

- `GET /health` returned consistent payloads for both apps.
- `GET /docs` returned `200` for both apps.
- `GET /docs-json` returned expected titles, tags, and paths.
- Invalid auth request returned a structured `400` error.
- CORS returned `Access-Control-Allow-Origin: http://localhost:5173`.
- Helmet returned security headers including `Content-Security-Policy`.
- XSS payload keys were escaped before validation error output.
- Rate limiting returned `429 Too Many Requests` after the configured request limit.

## Interview Explanation

Day 4 moved production API behavior from app-local setup into reusable infrastructure. The main design decision was to put cross-cutting concerns in `packages/common` and keep each app bootstrap thin. This makes the architecture easier to extend because future apps can opt into the same exception handling, validation, XSS protection, security headers, health checks, rate limiting, and Swagger setup without copying code.

The practical result is that `auth-api` and `booking-api` now expose consistent operational behavior while still owning their own business routes.

## Next Step

Day 5 introduces the guard/proxy app:

`Frontend -> Guard -> API`

That step moves frontend-facing auth decisions into a dedicated guard layer and brings the project closer to the Backend-Services style architecture.
