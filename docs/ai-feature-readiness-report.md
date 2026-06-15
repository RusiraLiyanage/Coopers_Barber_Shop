# AI Consultation Feature — Platform Readiness Report

_Prepared 2026-06-14. Scope: assess the Phase 1 (admin) groundwork and identify every
deficiency in backend and frontend that must be closed before building the Phase 2
agentic AI chat in the customer-facing app._

---

## 1. Executive summary

Phase 1 is **substantially built and well-structured**. The admin-api exposes
role-protected CRUD for barbers, service AI-config, and safety rules plus a read-only
brief viewer; the admin console covers all of it; the entities and SQL migrations for
every AI table exist; and the new `admin-api` upstream is already hardened with the
shared gateway-secret guard (secret matches across all four services).

However, the platform is **not yet ready for Phase 2**. The blocker is structural, not
cosmetic: the booking engine is still **single-barber**, so the core premise of the AI
feature — *match the most qualified barber for the situation* — cannot actually be
fulfilled end-to-end. Alongside that, the agent has no service to run in, no write-path
for briefs, and the customer app has no chat UI.

**Must-fix before Phase 2 (P0):**
1. Make booking **multi-barber** (availability + booking by `staffId`). _(B1)_
2. Stand up the **AI agent service** (Anthropic loop + 3 tools). _(B3)_
3. Add a **brief write-path** for `create_brief`. _(B2)_
4. Build the **customer chat UI** + matched-barber booking + streaming. _(F6–F8)_

---

## 2. What is already in place (baseline)

- `admin-api` app with modules: barbers, services (AI-config), safety-rules, briefs,
  auth — all guarded by `JwtAuthGuard` + `AdminRoleGuard` (ADMIN-only).
- Entities + **migrations** for `safety_rules`, `appointment_briefs`, `hair_history`,
  `invite_tokens`, `oauth_identities`, plus `staff.skills` / service AI-config columns.
- Gateway hardening: admin-api imports `InternalServiceAuthModule`, no browser CORS,
  rate-limit + XSS middleware; `INTERNAL_GATEWAY_SECRET` matches across guard/auth/
  booking/admin.
- Admin console (`admin-frontend`): full CRUD UI for barbers (skills), service AI-config
  (required skills, safety triggers, complexity), safety rules, and a brief drawer.
- Data model maps cleanly to the three planned tools: `match_barber` (Staff + Service),
  `check_safety_flags` (Service.safetyTriggers + SafetyRule + HairHistory),
  `create_brief` (AppointmentBrief).

---

## 3. Backend deficiencies

### P0 — Blocks Phase 2

- **B1. Booking engine is single-barber.**
  `appointments.service.ts` `getAvailability()` uses _"the first staff member found"_ and
  `book()` uses `staffService.getDefaultStaff()`. There is no way to request availability
  for, or book with, a specific barber. The agent's whole value (matching barber X) is
  unusable until this is fixed.
  **Do:** add `staffId` to availability + booking; compute availability per barber
  (honouring that barber's `bufferAfterMinutes`/timezone); persist the chosen `staffId`.

- **B2. No write-path for briefs.**
  `briefs.controller.ts` is GET-only. The `create_brief` tool has nowhere to persist a
  brief.
  **Do:** add an **internal** (agent-only, not admin-facing) endpoint or service method to
  create an `AppointmentBrief` linked to booking + barber.

- **B3. No AI/agent service exists.**
  Nothing hosts the Anthropic API calls, the agentic `while` loop, or the three tool
  implementations.
  **Do:** decide placement (recommend a new `ai-api` upstream behind the guard, mirroring
  admin-api's structure + hardening) and how it reads config (direct DB vs. internal calls
  to admin-api/booking-api). Define the 3 tool JSON schemas and the system-prompt builder
  that injects barbers/skills/rules.

### P1 — Important for correctness/quality

- **B4. `hair_history` is an orphan.** Table + entity exist, but there is **no service,
  controller, reader, or writer**. It is the cross-visit memory that powers safety
  detection ("you bleached last visit"). **Do:** decide who writes it (agent at brief time
  / barber post-visit) and expose a read path for `check_safety_flags`.

- **B5. `SafetyRule.services` references service _names_ (free-text), not IDs.** Renaming a
  service silently orphans its rules and breaks the agent's lookup. **Do:** key on service
  id (FK), render names in the UI.

- **B6. Two overlapping safety mechanisms.** `service.safetyTriggers` (bare keywords) and
  `SafetyRule` (condition + message + severity). The agent needs a defined contract for how
  `check_safety_flags` combines them. **Do:** specify the semantics before building the tool.

- **B7. Availability/booking DTOs have no `staffId`** (consequence of B1) — the customer app
  cannot ask for a specific barber's slots.

- **B11. Invite/admin-onboarding flow is unwired.** `invite_tokens` table + entity exist but
  no admin-api module/endpoints consume them — so there's no way to provision admin users
  (ties to the frontend login gap F1).

### P2 — Hardening / maintainability

- **B8. Concurrency.** Once multi-barber, booking needs transactional slot locking to avoid
  double-booking a barber under load.
- **B9. admin-api JWT strategy does not check session revocation** (same as booking-api).
  Acceptable behind the guard, but note the 5-min revoked-token window if ever exposed.
- **B10. No tests** for admin-api modules (barbers/safety/services/briefs).
- **B12. `API_PORT=7310` duplicated** in admin-api `.env` (cosmetic; admin uses
  `ADMIN_API_PORT=7313`).

---

## 4. Frontend deficiencies

### Admin console (`admin-frontend`)

- **F1. No login flow (blocker for usability).** `App.tsx` checks the session; if
  unauthenticated it shows a 403 with an "Open login" button that points back to the admin
  app's own root (`window.location.origin + '/'`) — a dead-end loop. There is no `login`
  call in `lib/api.ts`. Admins cannot authenticate from the admin app.
  **Do:** add a proper admin login page (or redirect to the customer app's login on the
  shared cookie domain and document it), plus the invite-acceptance UI (ties to B11).
- **F2. No hair-history view** (ties to B4) — barbers/admins can't see or correct client
  hair history.
- **F3. Briefs view is read-only** with basic pagination only — no search/filter, no
  correction/regenerate path. Acceptable for MVP; note for later.
- **F4. Services can only be AI-config-edited, not created** — fine if services are seeded
  in booking-api, but confirm a seeding/management path exists.
- **F5. No tests; no `.env.example`** documenting `VITE_API_URL`.

### Customer-facing app (`appointment-booking-frontend`) — required for Phase 2

- **F6. No chatbot UI exists.** Need a consultation chat component that opens after service
  selection, runs the agent conversation, and hands the matched barber to the booking flow.
- **F7. Booking flow can't consume a matched barber.** `makeAppointment` shows generic
  availability; it must take the agent's `barberId` and show _that_ barber's slots (ties to
  B1/B7).
- **F8. No streaming transport.** Need SSE/WebSocket (or chunked) integration for the
  agent's token streaming and tool-call status.

---

## 5. Recommended sequence to complete the platform

Dependency-ordered:

1. **B1/B7** — Multi-barber availability + booking (`staffId` through the stack).
2. **B3** — Stand up the AI agent service: 3 tool schemas, agent loop, system-prompt builder.
3. **B2** — Internal brief write-path used by `create_brief`.
4. **B4 + F2** — Wire `hair_history` (read for the agent, write at brief time, admin view).
5. **B5 + B6** — Safety model cleanup (service IDs; trigger-vs-rule contract).
6. **F1 + B11** — Admin login + invite acceptance.
7. **F6 + F7 + F8** — Customer chat UI, matched-barber booking, streaming.
8. **B10 / tests / env examples** — quality pass.

---

## 6. Open design decisions (need a call before building)

- **Agent service placement & config access** — new `ai-api` (recommended) vs. extend
  booking-api; direct DB vs. internal API for reading admin config.
- **`safetyTriggers` vs `SafetyRule` semantics** for `check_safety_flags`.
- **Who writes `hair_history`** (agent vs. barber post-visit).
- **Model id** — confirm/upgrade to the latest Claude model at build time (spec named an
  older one).
- **Streaming transport** — SSE vs. WebSocket for the chat.

> Note on ways of working: per the agreed approach, the Phase 2 agent code (tool schemas,
> the agent loop, system-prompt construction) will be **planned and guided** step-by-step
> rather than written wholesale, since this part is the hands-on AI-integration learning
> goal. The surrounding plumbing (multi-barber booking, brief endpoint, chat transport) can
> be implemented directly.
