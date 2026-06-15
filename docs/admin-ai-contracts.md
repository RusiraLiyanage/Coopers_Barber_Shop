# Admin AI Contracts

## Safety Evaluation

`Service.safetyTriggers` are keyword hints attached to a service. They help the future consultation agent detect that a client answer may need safety review.

`SafetyRule` records are the authoritative safety policy. Rules are linked to services by stable `serviceIds`, not service names. When a trigger matches a client answer, the agent should look up active rules for the selected service and return the matching rule message/severity.

This keeps triggers lightweight and editable while keeping the actual user-facing safety decision in `safety_rules`.

## Hair History

`hair_history` is the cross-visit memory source. The agent may read it before creating a consultation brief and may write a new record when a brief or post-visit summary captures durable hair state.

Barbers/admins can also read and correct this history from the admin console.

## Barber Matching

The current matching contract is:

- A barber is eligible when they are active and available.
- A barber should share at least one skill with `Service.requiredSkills`.
- For `high` complexity services, the agent should prefer `senior` or `owner` barbers.

The last rule is a ranking/preference for the upcoming AI matching flow. The current admin API stores the data but does not yet enforce assignment decisions.

## Admin API Auth Boundary

Browser-facing admin requests go through `booking-guard`, which validates/refreshes the cookie-backed session before proxying to `admin-api`. `admin-api` still checks the JWT role for admin-only routes, but it does not repeat the auth-session revocation lookup internally. That is acceptable while `admin-api` remains internal-only behind the guard and the `x-internal-gateway-secret` boundary.
