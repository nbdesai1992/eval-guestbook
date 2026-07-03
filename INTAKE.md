# INTAKE — eval-guestbook (routing brief)

## Goal (one sentence)
Ship a live Guestbook on Render where visitors submit name + message and see recent messages, with the full frontend→backend→storage→display path verified on the live URL by an automated test.

## Lane
**software** — full-stack web app (eval fixture, disposable).

## Canonical home
- Repo/dir: `~/projects/eval-guestbook/` (per brief — never `~/projects/guestbook`; disposable, safe to wipe).
- GitHub: `nbdesai1992/eval-guestbook`, **public** (zero secrets; public avoids the one-time Render GitHub-App grant on a new private repo).

## Service shape (first guess — finalized in spec-and-plan)
**web service + Postgres**, built as a genuine frontend↔backend split so the eval exercises inter-service wiring (the fixture's stated purpose is to hit every resource type: DB + backend + frontend + a cross-tier test). Two candidate topologies for spec-and-plan to finalize:
- (A) **Two services**: backend API web service + frontend web/static service + Postgres, wired via `fromService`/env. Matches fixture intent; exercises inter-service wiring.
- (B) One monolith service + Postgres (simpler, fewer free-tier wake-ups) — the prior run's choice; it does NOT exercise inter-service wiring.
- **Lean: (A)**, because the eval's job is to test the multi-service path, and the last run's monolith left that path untested.

## Acceptance contract — done = live & verified
On the **live URL**:
1. The page loads (200, renders form + recent-messages area).
2. `POST` a name + message succeeds and returns the created entry.
3. The message **persists** across reload (durable in Postgres, shared across visitors).
4. The new message appears in the recent-messages list (newest first).
5. `test/live_test.sh <base-url>` exercises submit→store→display end-to-end against the live site and exits 0.

## Human gates likely to fire
- None expected. Free web/static services + one free Postgres + migrations are all autonomous.
- Watch: if topology (A) needs a `sync: false` secret for the frontend→backend URL, that would gate — avoid by wiring the backend URL via `fromService` (non-secret), not a manual secret.
- New repo is **public**, so no Render GitHub-App grant gate.

## Open decisions needing Neal
- None. Topology finalized in spec-and-plan (leaning two-service per fixture intent).

## Next action
Proceed to **design-brief**.
