# Appointment Idempotency Operational QA

## Scope

This QA pass validates duplicate-safe customer appointment mutations through the booking guard.

## Protected Endpoints

| Customer action        | Guard endpoint                   | Internal booking-api endpoint    | Idempotent |
| ---------------------- | -------------------------------- | -------------------------------- | ---------- |
| Create appointment     | `POST /appointments`             | `POST /appointments`             | Yes        |
| Reschedule appointment | `PATCH /appointments/:id`        | `PATCH /appointments/:id`        | Yes        |
| Cancel appointment     | `PATCH /appointments/:id/cancel` | `PATCH /appointments/:id/cancel` | Yes        |

The required request header is:

- `Idempotency-Key: <stable UUID for this appointment mutation attempt>`

## Request Flow

1. The customer frontend generates an idempotency key with browser crypto.
2. The key is sent as the `Idempotency-Key` HTTP header.
3. `booking-guard` reads the header and forwards it to `booking-api`.
4. `booking-api` runs `IdempotencyInterceptor` before the appointment service method.
5. `IdempotencyService` checks `userId + method + path + request body hash`.
6. New requests run normally and store the final response.
7. Completed duplicate requests replay the original response.
8. In-flight duplicate requests return `409 Conflict`.
9. Same key with a different payload returns `409 Conflict`.

Only the three appointment mutation routes above are protected by the idempotency interceptor. Read-only routes such as availability and appointment listing do not require this header.

## Expiry And Cleanup

Expired idempotency rows are deleted by `IdempotencyCleanupService` inside `booking-api`.

Required cleanup env:

- `IDEMPOTENCY_KEY_TTL_SECONDS`
- `IDEMPOTENCY_KEY_CLEANUP_INTERVAL_SECONDS`

Current local defaults:

- `IDEMPOTENCY_KEY_TTL_SECONDS=86400`
- `IDEMPOTENCY_KEY_CLEANUP_INTERVAL_SECONDS=3600`

Cleanup runs once when `booking-api` starts and then every configured interval. Since each row stores an absolute `expires_at` timestamp, rows that expire while local services are stopped are deleted on the next startup cleanup.

## Local Prerequisites

Start the backend apps and the customer frontend:

```bash
pnpm --dir Backend dev
pnpm --dir Frontend/appointment-booking-frontend dev
```

Confirm the backend is healthy:

```bash
curl http://localhost:7311/health
curl http://localhost:7310/health
```

Confirm the migration for `idempotency_keys` has been applied before running the duplicate-submit checks.

## Browser QA: Create

1. Log in as a customer.
2. Open the new appointment modal.
3. Select a service and complete the AI consultation.
4. Select an appointment date and available slot.
5. Open browser DevTools on the Network tab.
6. Click `Book Appointment`.
7. Confirm the `POST /appointments` request includes an `Idempotency-Key` header.
8. Confirm the appointment is created once.
9. Refresh appointments and confirm only one booking appears for that slot.

Expected result:

- One appointment row is created.
- One appointment brief is created.
- One `idempotency_keys` row exists for the booking attempt with `status = completed`.

## Browser QA: Reschedule

1. Log in as a customer.
2. Open `My Appointments`.
3. Select an existing booked appointment and choose the update action.
4. Select a different valid date/time.
5. Open browser DevTools on the Network tab.
6. Click `Update Appointment`.
7. Confirm the `PATCH /appointments/:id` request includes an `Idempotency-Key` header.
8. Confirm the appointment changes once.

Expected result:

- One appointment row is updated.
- No duplicate appointment row is created.
- One `idempotency_keys` row exists for the update attempt with `method = PATCH` and `status = completed`.

## Browser QA: Cancel

1. Log in as a customer.
2. Open `My Appointments`.
3. Select a booked appointment and choose cancel.
4. Open browser DevTools on the Network tab.
5. Confirm cancellation.
6. Confirm the `PATCH /appointments/:id/cancel` request includes an `Idempotency-Key` header.
7. Confirm the appointment changes to cancelled once.

Expected result:

- The appointment is soft-cancelled once.
- No duplicate appointment row is created.
- One `idempotency_keys` row exists for the cancel attempt with `method = PATCH` and `status = completed`.

## Duplicate Click QA

Use the browser flow and double-click `Book Appointment` quickly.

Expected result:

- At most one appointment is created.
- If the second request reaches the backend while the first is still running, it returns `409 Conflict`.
- The customer UI shows `Your booking is already being processed.` instead of a generic error toast.
- If the second request reaches the backend after the first completed, it returns the same stored appointment response.

Repeat the same idea for update and cancel by triggering the action twice before the first request completes.

Expected result:

- At most one mutation is applied.
- The second in-flight request returns `409 Conflict`, or a later duplicate receives the stored response.

## Curl QA: Login

Log in through the booking guard and keep cookies:

```bash
curl -i -c /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@example.com","password":"Password123!"}' \
  http://localhost:7311/auth/login
```

## Curl QA: Create

Set a key and payload. Replace IDs/date/slot with valid local data:

```bash
export IDEMPOTENCY_KEY="$(uuidgen | tr '[:upper:]' '[:lower:]')"

cat > /tmp/coopers-booking-payload.json <<'JSON'
{
  "serviceId": "replace-service-id",
  "staffId": "replace-staff-id",
  "date": "2026-06-26",
  "slot": "09:00-09:30",
  "consultationSummary": "Operational QA appointment",
  "safetyNotes": "",
  "hairState": [],
  "desiredLook": "Standard haircut"
}
JSON
```

Create the appointment:

```bash
curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data @/tmp/coopers-booking-payload.json \
  http://localhost:7311/appointments
```

Replay the same request with the same key:

```bash
curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data @/tmp/coopers-booking-payload.json \
  http://localhost:7311/appointments
```

Expected result:

- Response status and body match the original completed booking response.
- No second appointment row is created.

## Curl QA: Reschedule

Use a new key and replace `replace-appointment-id` with a booked appointment owned by the logged-in customer:

```bash
export IDEMPOTENCY_KEY="$(uuidgen | tr '[:upper:]' '[:lower:]')"

cat > /tmp/coopers-update-payload.json <<'JSON'
{
  "date": "2026-06-26",
  "slot": "10:00-10:30"
}
JSON

curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data @/tmp/coopers-update-payload.json \
  -X PATCH \
  http://localhost:7311/appointments/replace-appointment-id
```

Replay the same update with the same key:

```bash
curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data @/tmp/coopers-update-payload.json \
  -X PATCH \
  http://localhost:7311/appointments/replace-appointment-id
```

Expected result:

- Response status and body match the original completed update response.
- The appointment is not updated twice.

## Curl QA: Cancel

Use a new key and replace `replace-appointment-id` with a booked appointment owned by the logged-in customer:

```bash
export IDEMPOTENCY_KEY="$(uuidgen | tr '[:upper:]' '[:lower:]')"

curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -X PATCH \
  http://localhost:7311/appointments/replace-appointment-id/cancel
```

Replay the same cancel with the same key:

```bash
curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -X PATCH \
  http://localhost:7311/appointments/replace-appointment-id/cancel
```

Expected result:

- Response status and body match the original completed cancellation response.
- The appointment remains cancelled.
- No second appointment row is created.

## Different Payload Same Key QA

Change the payload while keeping the same key:

```bash
cp /tmp/coopers-booking-payload.json /tmp/coopers-booking-payload-changed.json
# Edit date, slot, serviceId, staffId, or any other request body field.

curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data @/tmp/coopers-booking-payload-changed.json \
  http://localhost:7311/appointments
```

Expected result:

- Backend returns `409 Conflict`.
- Error message says the idempotency key was already used for a different request.
- No appointment is created for the changed payload.

For update, repeat this by changing the update date or slot while keeping the same key. For cancel, the path is part of the idempotency context, so the same key cannot be reused for another appointment ID.

## Missing Header QA

Send a mutation request without the header:

```bash
curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  --data @/tmp/coopers-booking-payload.json \
  http://localhost:7311/appointments
```

Expected result:

- Backend returns `400 Bad Request`.
- Error message says `Idempotency-Key header is required.`
- No appointment is created, updated, or cancelled.

## Failed Retry QA

Use a valid idempotency key with an intentionally invalid payload, for example an invalid slot, unavailable staff member, or invalid appointment state.

Expected result:

- First request fails and the idempotency record is marked `failed`.
- Retrying the same key with the same payload is allowed to execute again.
- Retrying the same key after correcting the payload is rejected because the request hash changed.
- A corrected booking should use a new idempotency key.

## Database Checks

Inspect recent idempotency records:

```sql
SELECT
  key,
  user_id,
  method,
  path,
  status,
  response_status_code,
  expires_at,
  created_at,
  updated_at
FROM idempotency_keys
ORDER BY created_at DESC
LIMIT 10;
```

Confirm duplicate appointments were not created:

```sql
SELECT
  user_id,
  staff_id,
  service_id,
  start_at,
  COUNT(*)
FROM appointments
GROUP BY user_id, staff_id, service_id, start_at
HAVING COUNT(*) > 1;
```

Expected result:

- The duplicate check returns no rows for idempotency QA attempts.

Confirm expired idempotency records are eventually removed:

```sql
SELECT COUNT(*)
FROM idempotency_keys
WHERE expires_at <= NOW();
```

Expected result:

- After startup cleanup or the next cleanup interval, this count trends back to `0`.

## Readiness Checklist

- Frontend sends `Idempotency-Key` for create/update/cancel only.
- Booking guard forwards `Idempotency-Key` for create/update/cancel only.
- Booking API applies `IdempotencyInterceptor` to create/update/cancel only.
- Same key + same request replays or reports in-flight processing.
- Same key + different request returns `409 Conflict`.
- Expired rows are removed by cleanup.
- `.env.example` documents required idempotency env values.
- No real secret values are needed for the idempotency feature.

## Automated Checks

Run the idempotency service tests:

```bash
pnpm --dir Backend --filter @coopers/common test -- idempotency-cleanup.service.spec.ts idempotency.service.spec.ts --runInBand
```

Run the affected package checks:

```bash
pnpm --dir Backend --filter @coopers/common lint
pnpm --dir Backend --filter @coopers/common build
pnpm --dir Backend --filter @coopers/booking.api lint
pnpm --dir Backend --filter @coopers/booking.api build
pnpm --dir Backend --filter @coopers/booking.guard lint
pnpm --dir Backend --filter @coopers/booking.guard build
pnpm --dir Frontend/appointment-booking-frontend lint
pnpm --dir Frontend/appointment-booking-frontend build
```

## Current Local Verification

Date: 2026-06-26

Verified:

- `@coopers/common` lint/build passed.
- `idempotency-cleanup.service.spec.ts` and `idempotency.service.spec.ts` passed with 10 tests.
- `@coopers/booking.api` lint/build passed.
- `@coopers/booking.guard` lint/build passed.
- `appointment-booking-frontend` lint/build passed.

Manual browser/curl QA still requires running local services with valid seeded customer, service, staff, and availability data.
