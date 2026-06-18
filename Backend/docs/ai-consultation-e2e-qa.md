# AI Consultation E2E QA

## Scope

This QA pass validates the customer consultation loop through the booking guard and confirms the resulting appointment brief is available to the admin platform.

## Local Run

Date: 2026-06-18

Backend services:

- `auth-api`: `http://localhost:7312/health` returned `200`
- `booking-api`: `http://localhost:7310/health` returned `200`
- `admin-api`: `http://localhost:7313/health` returned `200`
- `booking-guard`: `http://localhost:7311/health` returned `200`

Database:

- Postgres accepted connections on `localhost:5432`
- Required tables existed, including `appointment_briefs`, `appointments`, `services`, `staff`, `safety_rules`, and `users`
- Service, barber, and safety-rule seed data was present

## Flow Validated

1. Registered a temporary customer through `POST /auth/register` via booking guard.
2. Confirmed customer session through `GET /auth/session`.
3. Registered a temporary admin account and promoted it in the local database for admin API verification.
4. Confirmed admin session through `GET /admin-auth/session`.
5. Loaded services through `GET /services`.
6. Started consultation for `Hair Coloring` through `POST /consultation/start`.
7. Submitted consultation through `POST /consultation/submit/stream` with:
   - generated answers
   - `additional-comments`
   - optional `hairPhoto` payload using a tiny PNG
8. Received SSE events: `status`, `result`, `done`.
9. Received matched barber: `Sofia Bennett`.
10. Loaded availability for the matched barber through `GET /appointments/availability`.
11. Created appointment through `POST /appointments`.
12. Confirmed an `appointment_briefs` row was created for the appointment.
13. Confirmed `GET /admin/briefs` returned the generated brief for the admin platform.
14. Confirmed appointment brief generation metadata is present so admins can see whether the brief came from Claude or fallback.

## QA Finding Fixed

The first admin brief API response included `booking.customer.passwordHash` because `admin-api` returned raw joined TypeORM entities. This was fixed by returning a sanitized appointment brief response from `BriefsService`.

Post-fix verification confirmed:

- `booking.customer.passwordHash` is not present
- `booking.customer.mobile` is not present
- admin brief still includes customer email/name, service, barber, summary, safety notes, hair state, and desired look

## Release Readiness Addition

Phase 9 added persistent generation metadata to `appointment_briefs`:

- `generation_source`: `claude` or `fallback`
- `generation_model`: the Claude model ID, or `null` for fallback

The booking frontend sends this metadata from the consultation result when creating the appointment. The admin dashboard displays it in the appointment prep queue and drawer.

## Limitation

No real `ANTHROPIC_API_KEY` was present in the shell. The run validated the full product path using the deterministic fallback after Claude startup failed. A production Claude connectivity QA pass still needs a real server-side Anthropic key.

## Commands Verified

```sh
pnpm --dir Backend --filter @coopers/auth.api build
pnpm --dir Backend --filter @coopers/booking.api build
pnpm --dir Backend --filter @coopers/admin.api build
pnpm --dir Backend --filter @coopers/booking.guard build
pnpm --dir Backend --filter @coopers/admin.api lint
pnpm --dir Backend --filter @coopers/booking.api test -- consultation-ai.service.spec.ts appointments.service.spec.ts
pnpm --dir Frontend/appointment-booking-frontend build
pnpm --dir Frontend/appointment-booking-frontend lint
pnpm --dir Frontend/admin-frontend build
pnpm --dir Frontend/admin-frontend lint
```
