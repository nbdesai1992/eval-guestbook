# IMPLEMENTATION_PLAN — Guestbook (eval-guestbook)

## Bounded steps (each ends in a commit + a check)
1. **Scaffold repo** — `backend/` + `frontend/` dirs, root `render.yaml`, `.gitignore` (`.ship/`, `node_modules`), `README.md`. Check: `git status` clean after commit.
2. **Backend API** — Express app (`backend/server.js`): `GET /healthz`, `GET /api/entries` (latest 50, newest-first), `POST /api/entries` (validate name ≤80 / message ≤500, insert, 201). `pg` Pool from `DATABASE_URL` (SSL for external `.render.com` hosts). CORS allow-all (defensive). Check: `node -c server.js`.
3. **Migration** — `backend/migrations/0001_init.sql` (create `entries` + `schema_migrations`), `backend/migrate.js` runner (idempotent, tracks applied files in `schema_migrations`). Check: run against a local/psql DB or dry parse.
4. **Frontend** — `frontend/server.js` (Express): serve `public/`, `GET /healthz`, proxy `ALL /api/*` → `${API_URL}` (default `http://localhost:3001` for local). `public/index.html` + `style.css` + `app.js` (fetch same-origin `/api/entries`, render list newest-first, relative times, client validation, optimistic prepend + form clear). Check: `node -c server.js`.
4b. **package.json** for each service (`start`, `engines: node >=20 <23`, deps: backend `express`,`pg`; frontend `express` + a tiny proxy — use built-in `fetch` (Node ≥18) to avoid extra deps).
5. **Live test** — `test/live_test.sh <base-url>`: POST a unique message → assert 201; GET list → assert the message present; re-GET (fresh) → assert still present (persistence). Exit 0 only if all pass.
6. **critic pass** — pressure-test "will this work live?" (cold start, proxy path, migration ordering, CORS) before deploy.
7. **Local preflight** — `verify`/`run`: boot Postgres locally if available OR at minimum boot both node servers with a stubbed DB and hit `/healthz` + the proxy path. Localhost is preflight only.
8. **Push** — create public repo `nbdesai1992/eval-guestbook`, push `main`.
9. **Deploy** — via `render-deploy`: create free Postgres → wait `available` → create backend (`DATABASE_URL` from DB, pre-deploy `node migrate.js`) → get backend URL → create frontend (`API_URL`=backend URL) → deploy both.
10. **Verify live** — retry-through-wake: frontend `GET /` 200, run `test/live_test.sh <frontend-url>` exit 0, confirm deployed commit SHA matches `main`. Iterate on failure.

## Data / Persistence / Migration Decision (WRITTEN DOWN)
- **Persistence layer:** Render free Postgres (`eval-guestbook-db`), owned by the backend.
- **Schema** (`entries`):
  | column | type | notes |
  |--------|------|-------|
  | id | `bigint generated always as identity primary key` | |
  | name | `text not null` | app-validated ≤80 |
  | message | `text not null` | app-validated ≤500 |
  | created_at | `timestamptz not null default now()` | ordering key |
  - Index: `create index on entries (created_at desc, id desc)` for the list query.
- **Migration mechanism:** numbered SQL files (`migrations/0001_init.sql`, …) + a **`schema_migrations`** tracking table (`filename text primary key, applied_at timestamptz default now()`) + a Node runner `migrate.js` that applies unapplied files in order inside a transaction. Wired to the backend service **`preDeployCommand: node migrate.js`** — runs before each deploy serves traffic. **Not** `CREATE TABLE IF NOT EXISTS` on boot.
- **Seed/backfill:** none. **Rollback:** forward-only (no down migrations needed for a fixture; escalate to a framework only if that changes). **Verification:** `live_test.sh` proves write→read→persist end-to-end.
- Generated local DB files never committed.

## Verification plan
| AC | Local preflight | Live check |
|----|-----------------|-----------|
| AC1 page loads | `curl localhost/` renders form | `GET /` 200 + form markup |
| AC2 submit+appear | POST via curl → 201 | `live_test.sh` POST → 201, present in list |
| AC3 persist | re-GET after insert | `live_test.sh` fresh GET still present |
| AC4 newest-first ≤50 | order check locally | list order on live |
| AC5 invalid→400 | POST empty → 400 | curl empty POST on live → 400 |
| AC6 e2e test | `live_test.sh localhost` (if DB) | `live_test.sh <frontend-url>` exit 0 |

## Human-gate trigger checklist
- non-free service plan / disk / autoscaling / paid region — **clear** (both services free)
- paid database / keeping free DB past window — **clear** (one free Postgres; migrations via pre-deploy, not a gate; torn down after)
- `sync:false` secrets / env-var values — **clear** (`API_URL` + `DATABASE_URL` are non-secret, set at create time via fromService/fromDatabase)
- custom domain — **clear**
- external messaging / public launch — **clear** (internal eval)
- destructive deletion — **clear** now (teardown at the end deletes only recorded resource IDs)
- strategy/positioning — **clear**
- one-time Render GitHub-App access to new private repo — **clear** (repo is public)

**No gate fires → plan is auto-approved; proceed to build.**
