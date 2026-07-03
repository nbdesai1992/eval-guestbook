# SPEC — Guestbook (eval-guestbook)

## Requirements (each traces to a DESIGN_BRIEF acceptance criterion)

| # | Requirement | AC |
|---|-------------|----|
| R1 | Frontend `GET /` returns 200, renders heading + submit form (name, message) + recent-messages area | AC1 |
| R2 | `POST /api/entries {name,message}` validates (both required, name ≤80, message ≤500), inserts, returns created entry (201); appears at top of list w/o manual reload | AC2, AC5 |
| R3 | Entries stored in Postgres — durable across reload and shared across clients | AC3 |
| R4 | `GET /api/entries` returns latest 50 entries, newest-first; page renders them | AC4 |
| R5 | Invalid input → 400 with visible error; nothing stored | AC5 |
| R6 | `test/live_test.sh <base-url>` exercises frontend→backend→storage→display on the live site, exits 0 | AC6 |
| R7 | `GET /healthz` on each service → 200 (deploy health check) | — |

## Architecture

**Two Render web services + one free Render Postgres** — deliberately split to exercise inter-service wiring (the fixture's purpose is to hit every resource type + a cross-tier call). Both services `runtime: node`, `plan: free`, region `oregon`.

- **`eval-guestbook-db`** — free Postgres. One table `entries`. Backend connects via `DATABASE_URL` (Render `fromDatabase` / set at create).
- **`eval-guestbook-api`** (rootDir `backend`) — Node/Express JSON API. `GET/POST /api/entries`, `GET /healthz`. Owns the schema; runs migrations via **pre-deploy command** before serving. Talks to Postgres. CORS enabled defensively (though normal traffic is server-side-proxied).
- **`eval-guestbook-web`** (rootDir `frontend`) — Node/Express. Serves the static page (`public/`) **and proxies `/api/*` → the backend** using `API_URL` (the backend's URL, provided as a **non-secret env var** at create time — the inter-service wiring). Browser always calls same-origin `/api/...`, so **no CORS dependency and no backend URL baked into static JS**.

**Why the frontend proxies instead of the browser calling the backend directly:** a static frontend would have to hardcode the backend URL into shipped JS (fragile, rebuild-to-change) and require CORS. A thin proxying Node frontend takes the backend URL as a runtime env var (`fromService`-style, non-secret) — this is the honest, gate-free two-service pattern.

### Request path (the wiring the eval tests)
```
browser ──GET /──────────────▶ web (serves index.html + app.js)
browser ──POST /api/entries──▶ web ──proxy $API_URL──▶ api ──SQL──▶ Postgres
browser ──GET  /api/entries──▶ web ──proxy $API_URL──▶ api ──SQL──▶ Postgres
```

## render.yaml outline (documentation/validation; resources created imperatively)
```yaml
databases:
  - name: eval-guestbook-db
    plan: free

services:
  - type: web            # backend API
    runtime: node
    name: eval-guestbook-api
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /healthz
    preDeployCommand: node migrate.js
    envVars:
      - key: DATABASE_URL
        fromDatabase: { name: eval-guestbook-db, property: connectionString }

  - type: web            # frontend (serves page + proxies /api/*)
    runtime: node
    name: eval-guestbook-web
    plan: free
    rootDir: frontend
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /healthz
    envVars:
      - key: API_URL
        fromService: { name: eval-guestbook-api, type: web, property: host }
```
(Note: imperative create sets `API_URL` to the backend's real URL and `DATABASE_URL` to the DB connection string at `services create` time. `fromService`/`fromDatabase` above document intent.)

No `general_builder_keys` / `ANTHROPIC_API_KEY` — neither service calls a model provider. `DATABASE_URL` (backend) and `API_URL` (frontend) are the only env vars; both non-secret.

## Non-goals & constraints
- Non-goals: auth, edit/delete, moderation, pagination, rate limiting, likes/replies (per design brief).
- Constraints: free plans only; no secrets; no custom domain; no external messaging. Repo `nbdesai1992/eval-guestbook` **public** (zero secrets) → no Render GitHub-App grant needed.
