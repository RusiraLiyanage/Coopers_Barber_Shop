# Appointment Idempotency Operational QA

## Scope

This QA pass validates duplicate-safe customer appointment creation through the booking guard.

The protected endpoint is:

- `POST /appointments`

The required request header is:

- `Idempotency-Key: <stable UUID for this booking attempt>`

Expired idempotency rows are deleted by `IdempotencyCleanupService` inside `booking-api`.

Required cleanup env:

- `IDEMPOTENCY_KEY_TTL_SECONDS`
- `IDEMPOTENCY_KEY_CLEANUP_INTERVAL_SECONDS`

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

## Browser QA

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

## Duplicate Click QA

Use the browser flow and double-click `Book Appointment` quickly.

Expected result:

- At most one appointment is created.
- If the second request reaches the backend while the first is still running, it returns `409 Conflict`.
- The customer UI shows `Your booking is already being processed.` instead of a generic error toast.
- If the second request reaches the backend after the first completed, it returns the same stored appointment response.

## Curl QA

Log in through the booking guard and keep cookies:

```bash
curl -i -c /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@example.com","password":"Password123!"}' \
  http://localhost:7311/auth/login
```

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

## Missing Header QA

Send a booking request without the header:

```bash
curl -i -b /tmp/coopers-customer.cookies \
  -H 'Content-Type: application/json' \
  --data @/tmp/coopers-booking-payload.json \
  http://localhost:7311/appointments
```

Expected result:

- Backend returns `400 Bad Request`.
- Error message says `Idempotency-Key header is required.`
- No appointment is created.

## Failed Retry QA

Use a valid idempotency key with an intentionally invalid payload, for example an invalid slot or unavailable staff member.

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

## Automated Checks

Run the idempotency service tests:

```bash
pnpm --dir Backend --filter @coopers/common test -- idempotency.service.spec.ts --runInBand
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
- `idempotency.service.spec.ts` passed with 7 tests.
- `@coopers/booking.api` lint/build passed.
- `@coopers/booking.guard` lint/build passed.
- `appointment-booking-frontend` lint/build passed.

Manual browser/curl QA still requires running local services with valid seeded customer, service, staff, and availability data.
