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

## Session timeout behavior

Session timeout and extension decisions are owned by the backend. The frontend
only shows the extend-session or expired-session UI after the booking guard/auth
API returns the matching session error response.
