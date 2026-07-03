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

# --- Step 1: POST a new entry, expect HTTP 201 ---
POST_BODY="{\"name\":\"eval-bot\",\"message\":\"$MARKER\"}"
POST_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$BASE/api/entries" \
  -H 'Content-Type: application/json' \
  -d "$POST_BODY")

if [ "$POST_STATUS" = "201" ]; then
  pass "POST /api/entries returned 201"
else
  fail "POST /api/entries returned $POST_STATUS (expected 201)"
fi

# --- Step 2: GET the list, expect marker present ---
GET1=$(curl -s -w '\n%{http_code}' "$BASE/api/entries")
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
GET2_BODY=$(curl -s "$BASE/api/entries")
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
