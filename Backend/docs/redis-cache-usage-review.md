# Redis Cache Usage Review

Redis is a short-lived performance layer. PostgreSQL remains the source of truth for every booking, admin, and consultation decision.

## Current Cache Scope

| Cache key | Cached data | Main read path | Invalidation path |
| --- | --- | --- | --- |
| `consultation:active-service:{serviceId}` | Active service configuration used by consultation and AI matching | Booking consultation fallback and Claude tool flow | Admin service create/update/AI-config update |
| `consultation:active-safety-rules` | Active safety rules used to interpret consultation answers | Booking consultation fallback and Claude tool flow | Admin safety rule create/update, service update/AI-config update |
| `consultation:available-barbers` | Active and available barber capability profiles | Booking consultation fallback and Claude tool flow | Admin barber create/update/delete |
| `consultation:client-hair-history:{userId}` | Recent customer hair history for consultation context | Booking consultation fallback and Claude tool flow | Booking appointment creation, admin hair-history creation, admin brief-to-history creation |

## Why These Reads Are Safe To Cache

- They are read repeatedly during consultation question generation and barber matching.
- They are reference/context data, not transactional booking state.
- The default TTL keeps cache entries short lived even if an invalidation path is missed.
- The application falls back to PostgreSQL when Redis is disabled or unavailable.

## What Should Not Be Cached Here

- Login sessions, refresh tokens, or authentication state.
- Appointment slot availability and booking conflict checks.
- Payment, cancellation, or appointment write decisions.
- Admin table pagination responses that change frequently and are already checked through the admin freshness polling flow.

## Review Result

The current Redis usage is correctly focused on AI consultation context and barber matching performance. It should reduce repeated PostgreSQL reads during the Claude tool loop without making booking correctness depend on Redis.

## Failure Behavior

Redis failures must not fail booking, consultation, or admin writes.

- Read failures return a cache miss so the application can load from PostgreSQL.
- Write failures are logged and the request continues with the PostgreSQL result.
- Delete failures are logged and the mutation still succeeds; stale Redis data is bounded by the configured TTL.
- Health checks report Redis as `unavailable` when primary or reader pings fail.

## Performance Measurement

`CacheService` logs Redis cache operations with latency:

- `Redis cache hit: {key} ({latencyMs}ms)`
- `Redis cache miss: {key} ({latencyMs}ms)`
- `Redis cache write: {key} ({latencyMs}ms, ttl={ttlSeconds}s)`
- `Redis cache delete: {key} ({latencyMs}ms)`
- `Redis cache delete pattern: {pattern} ({latencyMs}ms, deleted={count})`

For local comparison, run the same consultation flow twice. The first run should show cache misses followed by writes, and the second run should show hits for the same consultation context keys.

Invalidation tests now cover the mutation paths that change service, barber, safety-rule, and hair-history data:

- Service create/update/AI-config update clears service and safety-rule consultation cache.
- Barber create/update/delete clears available-barber consultation cache.
- Safety rule create/update clears active safety-rule consultation cache.
- Booking appointment creation, admin hair-history creation, and admin brief-to-history creation clear customer hair-history consultation cache.

Future cache additions should include matching invalidation tests in the same change.
