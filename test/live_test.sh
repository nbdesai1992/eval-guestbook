#!/usr/bin/env bash
set -euo pipefail

# Live end-to-end test: frontend -> backend -> Postgres -> display.
# Usage: test/live_test.sh <base-url>   (base-url = the FRONTEND url)

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi

BASE="${1%/}"
MARKER="guestbook-test-$$-$(date +%s)"
FAILED=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAILED=1; }

echo "Base URL: $BASE"
echo "Marker:   $MARKER"

# --- Step 0: wake the (free-tier, spun-down) services before asserting ---
# Frontend and backend can cold-start sequentially (60-120s). Warm the full
# path via the proxied /api/entries until it answers 200, so a cold start
# doesn't read as a failure.
echo "Warming services (up to ~2m)..."
warm=0
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/api/entries" || echo 000)
  if [ "$code" = "200" ]; then warm=1; echo "warm after ${i} tries (HTTP 200)"; break; fi
  sleep 4
done
[ "$warm" -eq 1 ] || echo "WARN: services did not warm to 200; continuing to assert anyway"

# --- Step 1: POST a new entry, expect HTTP 201 ---
POST_BODY="{\"name\":\"eval-bot\",\"message\":\"$MARKER\"}"
POST_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 --retry 2 --retry-all-errors --retry-delay 3 \
  -X POST "$BASE/api/entries" \
  -H 'Content-Type: application/json' \
  -d "$POST_BODY")

if [ "$POST_STATUS" = "201" ]; then
  pass "POST /api/entries returned 201"
else
  fail "POST /api/entries returned $POST_STATUS (expected 201)"
fi

# --- Step 2: GET the list, expect marker present ---
GET1=$(curl -s -w '\n%{http_code}' --max-time 30 --retry 2 --retry-all-errors --retry-delay 3 "$BASE/api/entries")
GET1_STATUS=$(printf '%s' "$GET1" | tail -n1)
GET1_BODY=$(printf '%s' "$GET1" | sed '$d')

if [ "$GET1_STATUS" = "200" ]; then
  pass "GET /api/entries returned 200"
else
  fail "GET /api/entries returned $GET1_STATUS (expected 200)"
fi

if printf '%s' "$GET1_BODY" | grep -q "$MARKER"; then
  pass "marker present in list after insert"
else
  fail "marker NOT found in list after insert"
fi

# --- Step 3: second fresh GET, assert marker still present (persistence) ---
GET2_BODY=$(curl -s --max-time 30 --retry 2 --retry-all-errors --retry-delay 3 "$BASE/api/entries")
if printf '%s' "$GET2_BODY" | grep -q "$MARKER"; then
  pass "marker still present on fresh GET (persistence)"
else
  fail "marker NOT found on fresh GET (persistence failed)"
fi

echo "----"
if [ "$FAILED" -eq 0 ]; then
  echo "ALL PASS"
  exit 0
else
  echo "SOME FAILED"
  exit 1
fi
