# DESIGN BRIEF — Guestbook (eval-guestbook)

## 1. Problem & outcome
Visitors to a page want to leave a short public note and see that others have done the same. **Outcome = success:** a visitor submits a name + message, immediately sees it in the recent list, and it's still there when they (or anyone else) reload — on a live public URL.

## 2. Target user & context
Anyone with the link, on desktop or phone, arriving cold with no account. One-shot interaction: read the recent notes, optionally leave one, leave. No return-visitor features needed.

## 3. Core flows
1. **Read** — Land on `/`. See a heading, a short intro line, and the most-recent messages (name, message, relative time), newest first.
2. **Post** — Fill name + message, press Submit. Client validates non-empty + length caps, POSTs to the API, the new entry appears at the top of the list without a full-page reload, and the form clears.
3. **Persistence check** — Reload the page (or open in another browser). The message is still there, served from the database — proving it's durable and shared, not local state.

## 4. Scope (v1)
- Single page: form + recent-messages list.
- Backend API: create-entry + list-recent (latest 50), backed by Postgres.
- Server-side validation (name required ≤80, message required ≤500) mirrored client-side.
- Relative timestamps ("2m ago").
- A live end-to-end test script exercising submit→store→display against the deployed URL.
- Responsive, works on a phone.

## 5. Non-goals
Auth / identity, edit or delete, moderation or spam filtering, pagination / infinite scroll, likes/replies, rate limiting, email or notifications, avatars. Explicitly out of v1.

## 6. Visual direction
Clean, warm, "signed a guestbook" feel — not a dashboard. Single centered column, generous whitespace, one accent color, system font stack. Card-style message list with subtle dividers; the compose form sits above the list. Light default with a legible dark-mode via `prefers-color-scheme`. Density: comfortable, ~600px max content width. Tone of copy: friendly and plain ("Leave a message", "Recent messages"). No frameworks required — vanilla HTML/CSS/JS is fine and preferred for a fixture.

## 7. Acceptance criteria (the "works" contract — verified on the LIVE url)
- **AC1** — `GET /` returns 200 and renders the heading, a submit form (name + message), and a recent-messages area.
- **AC2** — Submitting a valid name + message creates the entry (API returns 201 with the created record) and it appears at the top of the list without a manual reload.
- **AC3** — The entry **persists**: after a full reload (and from a different client), the message is still listed — served from Postgres.
- **AC4** — The recent list shows the latest entries newest-first (cap 50).
- **AC5** — Invalid input (empty name/message, or over the length caps) is rejected with a 400 and a visible message; nothing is stored.
- **AC6** — `test/live_test.sh <base-url>` runs the full frontend→backend→storage→display path against the live site and exits 0.

## 8. Risks / unknowns
- **Free-tier cold starts** — services spin down; first request after idle is slow. Live verification must retry through the wake (render-deploy handles this).
- **Two-service wiring** — the frontend must reach the backend by URL. Wire it via `fromService` (a non-secret Render-provided URL), NOT a `sync:false` secret, to stay autonomous and avoid a human gate. CORS must allow the frontend origin.
- **DB availability lag** — new free Postgres can take a minute to become `available`; migrations run pre-deploy, so ordering matters.
- **Migration on a fresh DB** — schema must be created via a tracked migration before first serve, not `CREATE TABLE IF NOT EXISTS` on every boot.
