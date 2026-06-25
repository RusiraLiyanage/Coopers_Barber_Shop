// Shared JWT defaults so the signer (auth-api) and every verifier (the auth-api,
// admin-api and booking-api strategies plus the gateway) stay in lockstep. If
// these ever diverged, valid tokens would start being rejected — so they live in
// one place rather than being duplicated per service.

// Bound into every access token (iss/aud) and checked by every verifier, so a JWT
// minted with JWT_SECRET for any other purpose cannot be replayed as an access
// token. Not secrets — safe to hardcode, and hardcoding avoids per-service env
// drift that would silently break verification.
export const JWT_ISSUER = 'coopers-auth';
export const JWT_AUDIENCE = 'coopers-api';
