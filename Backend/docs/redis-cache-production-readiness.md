# Redis Cache Production Readiness

Redis is used only as a short-lived cache for consultation and barber-matching context. PostgreSQL remains the source of truth.

## Required Runtime Configuration

Set these values in both `booking-api` and `admin-api` environments:

```env
REDIS_CACHE_ENABLED=true
REDIS_CACHE_DEFAULT_TTL_SECONDS=300
REDIS_PRIMARY_HOST=your-primary-redis-endpoint
REDIS_PRIMARY_PORT=6379
REDIS_PRIMARY_USERNAME=
REDIS_PRIMARY_PASSWORD=
REDIS_PRIMARY_TLS_ENABLED=false
REDIS_READER_HOST=your-reader-redis-endpoint
REDIS_READER_PORT=6379
REDIS_READER_USERNAME=
REDIS_READER_PASSWORD=
REDIS_READER_TLS_ENABLED=false
```

For local development, primary and reader can point to the same Docker Redis instance. In production, use the managed Redis primary endpoint for writes and a reader endpoint for reads when the infrastructure provides one.

## Managed Redis Recommendation

For AWS deployment, use a managed Redis service such as Amazon ElastiCache for Redis/Valkey rather than running Redis inside the application containers.

Production setup should include:

- private network access only, no public Redis endpoint
- TLS enabled when the managed Redis cluster requires or supports it
- auth token or ACL credentials stored as deployment secrets
- enough memory for consultation context cache with headroom
- eviction policy appropriate for cache-only data
- backup/restore disabled or treated as optional, because PostgreSQL owns the data

## Observability

The app exposes Redis status through each API health endpoint:

- `booking-api /health`
- `admin-api /health`

Expected statuses:

- `disabled`: Redis cache is intentionally off.
- `ok`: primary and reader both respond to `PING`.
- `unavailable`: Redis is configured but primary or reader is unreachable.

`CacheService` also logs cache hit, miss, write, delete, and pattern-delete latency. These logs are enough for the current feature because Redis is not part of booking correctness.

## Failure Policy

Redis failure must not block booking, consultation, or admin writes.

- Cache read failure becomes a cache miss and the app reads from PostgreSQL.
- Cache write failure logs a warning and the request still succeeds.
- Cache delete failure logs a warning and stale entries expire by TTL.
- Health checks reveal Redis availability without making the API unusable.

## Release Checklist

- Add Redis env values to the deployment secret/config store for both APIs.
- Confirm `REDIS_CACHE_DEFAULT_TTL_SECONDS` is explicitly set.
- Confirm primary/reader endpoints are reachable from the API runtime network.
- Confirm auth/TLS values match the managed Redis configuration.
- Deploy with `REDIS_CACHE_ENABLED=false` first if a safer staged rollout is needed.
- After enabling cache, run the same consultation twice and confirm first-run miss/write logs and second-run hit logs.
- Confirm `/health` reports `redis.status = ok` after deployment.

## Rollback

Set `REDIS_CACHE_ENABLED=false` and redeploy the affected API services. The application will continue using PostgreSQL directly for consultation context reads.
