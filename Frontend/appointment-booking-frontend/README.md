# Cooper's BarberShop Frontend

React and Vite frontend for the Cooper's BarberShop booking flow.

## Local commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

In the local full-stack flow, open the app through the booking guard URL, not the Vite URL directly. The guard owns the browser-facing route and forwards requests to the frontend, auth API, and booking API.

## Session timeout configuration

The frontend idle-session flow is controlled by Vite environment variables:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `VITE_SESSION_IDLE_TIMEOUT_SECONDS` | `300` | How long the user can be idle before the extend-session prompt appears. |
| `VITE_SESSION_EXTENSION_GRACE_SECONDS` | `300` | How long the prompt can stay unanswered before the frontend calls logout and revokes the backend session. |

The auth API should keep its backend idle timeout slightly longer than the frontend idle timeout plus expected request delay:

```env
SESSION_IDLE_TIMEOUT_SECONDS=600
```

For quick local testing, run the frontend with short values:

```bash
VITE_SESSION_IDLE_TIMEOUT_SECONDS=20 VITE_SESSION_EXTENSION_GRACE_SECONDS=20 npm run dev
```

Expected behavior:

- Active users continue normally because the guard refreshes expired access tokens when needed.
- Idle users see a non-closable extend-session prompt.
- If the prompt is ignored, the frontend calls logout and the backend session is revoked.
- After logout, the user sees a session-expired message and must log in again.
