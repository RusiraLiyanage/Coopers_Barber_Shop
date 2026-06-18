# AI Consultation Release Readiness

## Required Environment

`booking-api` needs these AI-specific variables for live Claude execution:

```sh
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5
```

`ANTHROPIC_MODEL` is optional. If omitted, `booking-api` uses `claude-haiku-4-5` for lower latency.

Do not add real Anthropic keys to committed `.env.*` files. For local QA, export the key in the shell that starts `booking-api` or use an uncommitted local environment file.

## Live Claude QA Checklist

1. Start `auth-api`, `booking-api`, `admin-api`, and `booking-guard`.
2. Confirm all health endpoints return `200`.
3. Register or log in as a customer through `booking-guard`.
4. Start a consultation for a configured service such as `Hair Coloring`.
5. Submit answers through `/consultation/submit/stream`, including optional `hairPhoto` if testing vision.
6. Confirm the stream includes normal status/tool events and a final `result`.
7. Confirm `result.generation.source` is `claude`.
8. Confirm `result.generation.model` matches the configured model.
9. Create an appointment with the matched barber.
10. Confirm `appointment_briefs.generation_source` is `claude`.
11. Confirm the admin dashboard shows the generated brief source as Claude.

## Fallback QA Checklist

1. Start `booking-api` without `ANTHROPIC_API_KEY`.
2. Run the same consultation submit flow.
3. Confirm booking still succeeds.
4. Confirm `result.generation.source` is `fallback`.
5. Confirm `appointment_briefs.generation_source` is `fallback`.
6. Confirm logs include the Claude failure and fallback message.

## Operational Notes

- Customer-uploaded hair photos are sent to Claude for consultation reasoning only.
- Hair photos are not persisted in the database.
- Appointment briefs persist the durable barber handoff: summary, safety notes, hair state, desired look, generation source, and generation model.
- Claude is not the source of truth for service availability, barber validity, or safety rules. Backend validation still owns those decisions before the result is returned.

## Release Gate

Before release, run:

```sh
pnpm --dir Backend --filter @coopers/auth.api build
pnpm --dir Backend --filter @coopers/booking.api build
pnpm --dir Backend --filter @coopers/admin.api build
pnpm --dir Backend --filter @coopers/booking.guard build
pnpm --dir Backend --filter @coopers/booking.api lint
pnpm --dir Backend --filter @coopers/admin.api lint
pnpm --dir Backend --filter @coopers/booking.guard lint
pnpm --dir Backend --filter @coopers/booking.api test -- consultation-ai.service.spec.ts appointments.service.spec.ts
pnpm --dir Frontend/appointment-booking-frontend build
pnpm --dir Frontend/appointment-booking-frontend lint
pnpm --dir Frontend/admin-frontend build
pnpm --dir Frontend/admin-frontend lint
```
