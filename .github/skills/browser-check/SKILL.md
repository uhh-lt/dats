---
name: browser-check
description: Click through this worktree's running DATS dev instance in a headless browser to verify a frontend change visually. Use after implementing or changing UI, before opening or updating a PR, or when asked to check, test or screenshot something in the app.
---

## When to use

You changed something users see (a view, dialog, table, analysis, annotation tool) and want to confirm it works in the real app, not only in lint and typecheck. Report what you checked in the PR description.

## Prerequisites

- The worktree is set up (`just worktree-up` succeeded, see the `worktree-setup` skill).
- Browser tools are available: the `playwright` MCP server provides tools named `mcp__playwright__browser_*` (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_file_upload`, `browser_wait_for`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`, `browser_close`). If they are missing, they may be deferred: load them in one ToolSearch call with the query `mcp__playwright__browser_`. If they still do not exist, the developer has not done the one-time setup in `docs/development/worktrees.md` ("Browser checks"): say so in your report, point to that section and skip the visual check. Do not install a browser or Playwright into the project, and do not change the developer's Claude Code configuration.

## 1. Start the dev servers

Start them in the background (never block on them) and keep their output in log files:

```bash
just dev backend   # API; runs migrations and creates the system and demo user on start
just dev worker    # only needed if documents are uploaded or jobs run (preprocessing, LLM assistant, ...)
just dev frontend  # Vite dev server
```

Read the ports from this worktree's env files, never hardcode them:

- frontend: `FRONTEND_PORT` in `frontend/.env`, so the app is at `http://localhost:<FRONTEND_PORT>`
- API: `UVICORN_PORT` in `backend/.env`; it is ready when `curl -sf http://localhost:<UVICORN_PORT>/heartbeat` answers `true`

Wait until both answer before opening the browser. If a server fails to start, read its log and fix the cause.

## 2. Log in

Open `http://localhost:<FRONTEND_PORT>/login` and log in as the demo user. Its credentials are `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` from `backend/.env`, falling back to the defaults in `backend/configs/default.yaml` (`demo_user`). Never use or print other credentials, and never change any account.

## 3. Get test data

A fresh worktree has an empty database. If the check needs data:

- Create a small project as the demo user.
- Upload two or three short plain-text documents (write them to a temporary folder outside the repo first and use `browser_file_upload`), and run `just dev worker` so they get preprocessed. Sentence splitting and other ML steps use the shared hosted Ray service, so give preprocessing a minute and wait until the documents are finished.
- Create the codes, tags or annotations your feature needs, through the UI or the API.

Keep the data minimal and only in this worktree's database. `just worktree-down` deletes it.

## 4. Click through

- Navigate to the feature and use `browser_snapshot` to read the page (prefer it over screenshots for finding elements and text).
- Exercise the main path of the change and at least one edge case (empty state, error, many items).
- Check `browser_console_messages` for errors and `browser_network_requests` for failed API calls.
- Take a `browser_take_screenshot` of each important state when it helps the review, and save screenshots outside the repository (e.g. your scratchpad); never commit them.

## 5. Report and clean up

- Close the browser (`browser_close`) and stop the dev servers you started.
- In your report and the PR description, list what you clicked through, what worked, and anything broken or not checked.
