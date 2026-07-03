# EVIDENCE — eval-guestbook

## Live URLs
- **Frontend (app):** https://eval-guestbook-web.onrender.com  ← the product URL
- Backend API: https://eval-guestbook-api.onrender.com
- Repo: https://github.com/nbdesai1992/eval-guestbook

## Deployed commit
- `c22f8e1` (== local `main`), verified `live` on BOTH services.

## Render resources (see .ship/resources.json for teardown)
- postgres `eval-guestbook-db` = dpg-d93ldjojs32c73cl3deg-a (free, oregon, v16)
- service `eval-guestbook-api` = srv-d93lgptaeets73e07ol0
- service `eval-guestbook-web` = srv-d93lgtflk1mc739gdt00

## Acceptance criteria — verified on the LIVE url
- AC1 page loads: `GET /` → 200, contains "Guestbook" + form fields. ✓
- AC2 submit → 201 and appears: valid POST → 201 `{id:"2",name:"Ada",...}`. ✓
- AC3 persists: marker still present on fresh GET (live_test step 3). ✓
- AC4 newest-first, ≤50: list ordered_desc == True, newest = last posted. ✓
- AC5 invalid rejected: empty → 400, name>80 → 400. ✓
- AC6 e2e test: `test/live_test.sh <frontend-url>` → ALL PASS, exit 0. ✓

## Architecture (two-service, exercises inter-service wiring)
browser → eval-guestbook-web (serves page + proxies /api/* via API_URL)
       → eval-guestbook-api (Express, validates, SQL)
       → Postgres eval-guestbook-db
Migration ran at boot (free tier: `npm start` = `node migrate.js && node server.js`),
verified by `GET /api/entries` → `[]` on first live hit (table existed).
