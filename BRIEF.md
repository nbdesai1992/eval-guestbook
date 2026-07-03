# Brief: Guestbook (eval fixture)

## Objective
Ship a simple, live Guestbook web app on Render.

## What it does
Visitors enter their name and a short message, submit it, and see the most recent
messages displayed on the page.

## Acceptance criteria (verified on the LIVE url)
- The page loads.
- I can submit a name + message.
- The message persists (still there on reload / for other visitors).
- The new message appears in the recent-messages list.
- An automated test confirms the frontend→backend→storage→display path against the
  live site.

## Constraints
- Free Render plans only.
- No secrets, paid resources, custom domains, or external messaging.

## Execution: in-session
(The eval session does the build itself — every step visible live in the terminal.
Headless is reserved for batch/regression runs via eval_run.sh, which are bounded
and watchable with run_status.py.)

## Build location
This is a disposable EVAL. Build into `~/projects/eval-guestbook/` (never `~/projects/guestbook`) so it can't be confused with a real product and is safe to wipe on reset.

## Done / Stop
- Done when all acceptance criteria pass on the live URL.
- Stop and flag only if a genuine human gate is hit (spend, secrets, destructive
  action, or a one-time repo-access grant), with everything shipped so far.
