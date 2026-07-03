# eval-guestbook

A tiny public guestbook: visitors leave a name + message and see the latest notes newest-first. It runs as **two Node/Express services plus one Postgres database** — `backend/` is a JSON API (`GET`/`POST /api/entries`, `/healthz`) that owns the schema and talks to Postgres, and `frontend/` serves the static page (`public/`) and proxies `/api/*` to the backend via the `API_URL` env var, so the browser only ever calls same-origin.

## Run locally

You need Node 20–22 and a Postgres reachable via `DATABASE_URL`.

```bash
# backend (port 3001)
cd backend && npm install
export DATABASE_URL=postgres://user:pass@localhost:5432/guestbook
node migrate.js      # apply migrations
npm start

# frontend (port 3000), in a second shell
cd frontend && npm install
export API_URL=http://localhost:3001   # optional; this is the default
npm start
```

Open http://localhost:3000.

## Run the live test

Exercises frontend -> backend -> storage -> display end-to-end (POST, then two fresh GETs asserting persistence):

```bash
test/live_test.sh http://localhost:3000     # or the deployed frontend URL
```

It exits 0 only if every step passes.
