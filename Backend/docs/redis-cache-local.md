# Redis Cache Local Setup

Redis is used as a short-lived performance layer for consultation reference data. PostgreSQL remains the source of truth.

## What Is Cached

- Active service context by service ID
- Active safety rules
- Active and available barber list
- Recent customer hair history by customer ID

These are read repeatedly during the Claude consultation tool loop and deterministic fallback matching, so Redis reduces repeated PostgreSQL reads.

## Required Env

Add these values to both `apps/booking-api/.env` and `apps/admin-api/.env`:

```env
REDIS_CACHE_ENABLED=true
REDIS_CACHE_DEFAULT_TTL_SECONDS=300
REDIS_PRIMARY_HOST=localhost
REDIS_PRIMARY_PORT=6379
REDIS_READER_HOST=localhost
REDIS_READER_PORT=6379
```

For local development, primary and reader point to the same Redis instance. In production they can point to separate writer/reader endpoints if the infrastructure provides them.

## Start Redis Locally

From the `Backend` directory:

```bash
pnpm redis:up
```

Check logs:

```bash
pnpm redis:logs
```

Open a Redis CLI:

```bash
pnpm redis:cli
```

Stop Redis:

```bash
pnpm redis:down
```

## Verify The Cache

1. Start Redis with `pnpm redis:up`.
2. Start the backend apps.
3. Open the booking/admin health endpoints and confirm the `redis` check is `ok`.
4. Run a consultation flow once.
5. Run the same consultation flow again.
6. Check booking API logs for `Redis cache hit` messages from `CacheService`.

Example health response:

```json
{
  "service": "booking-api",
  "status": "ok",
  "checks": {
    "redis": {
      "enabled": true,
      "latencyMs": 2,
      "status": "ok"
    }
  }
}
```

You can also inspect keys:

```bash
pnpm redis:cli
keys consultation:*
```

## Invalidation Rules

Admin-side writes clear stale consultation cache entries:

- Barber create/update/delete clears `consultation:available-barbers`.
- Service create/update/AI-config update clears that service cache and active safety rules.
- Safety rule create/update clears `consultation:active-safety-rules`.
- Hair history creation clears that customer's hair-history cache.

Booking-side appointment creation also clears the customer hair-history cache when a customer-reported hair history record is saved.
