---
name: browser-check
description: Click through this worktree's running DATS dev instance in a headless browser to verify a frontend change visually. Use after implementing or changing UI, before opening or updating a PR, or when asked to check, test or screenshot something in the app.
---

## When to use

You changed something users see (a view, dialog, table, analysis, annotation tool) and want to confirm it works in the real app, not only in lint and typecheck. Report what you checked in the PR description.

## Prerequisites

- The worktree is set up (`just worktree-up` succeeded, see the `worktree-setup` skill).
- Browser tools are available: the `playwright` MCP server provides tools named `mcp__playwright__browser_*` (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_file_upload`, `browser_wait_for`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`, `browser_close`). If they are missing, they may be deferred: load them in one ToolSearch call with the query `mcp__playwright__browser_`. If they still do not exist, the developer has not done the one-time setup in `docs/development/worktrees.md` ("Browser checks"): say so in your report, point to that section and skip the visual check. Do not install a browser or Playwright into the project, and do not change the developer's Claude Code configuration.
- If pages fail with `ERR_CERT_AUTHORITY_INVALID`, the developer's server lacks `--ignore-https-errors` (see the same docs section). Say so in your report.

## 1. Start the dev servers

Start them in the background (never block on them) and keep their output in log files:

```bash
just dev backend   # API; runs migrations and creates the system and demo user on start
just dev worker    # only needed if documents are uploaded or jobs run (preprocessing, LLM assistant, ...)
just dev frontend  # Vite dev server
```

Read the ports from this worktree's env files, never hardcode them:

- frontend: `FRONTEND_PORT` in `frontend/.env`. The dev server uses **HTTPS** with a self-signed certificate, so the app is at `https://localhost:<FRONTEND_PORT>`.
- API: `UVICORN_PORT` in `backend/.env` (plain HTTP); it is ready when `curl -sf http://localhost:<UVICORN_PORT>/heartbeat` answers `true`.

Wait until both answer before opening the browser. If a server fails to start, read its log and fix the cause.

## 2. Log in

Open `https://localhost:<FRONTEND_PORT>/login` and log in as the demo user. Its credentials are `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` from `backend/.env`, falling back to the defaults in `backend/configs/default.yaml` (`demo_user`). Never use or print other credentials, and never change any account.

After the first login, a "What's new in DATS" dialog blocks every click. Close it with "Do not show again".

## 3. Get test data

A fresh worktree has an empty database. Keep test data minimal and only in this worktree's database (`just worktree-down` deletes it). Seeding through the API is much faster and more precise than clicking:

- Log in: `POST /authentication/login` with form fields `username` (email) and `password` returns an `access_token`; send it as `Authorization: Bearer <token>`.
- A second annotator: `POST /authentication/register`, then `PATCH /user/{project_id}/user` to add the user to the project, then log in as that user.
- Codes: `PUT /code` (`name`, `color`, `description`, `parent_id`, `project_id`, `is_system: false`, `enabled: true`). New projects already contain about 135 system codes (e.g. `PERSON`, `ORG`), so give test codes distinct names.
- Documents: create a small project and upload two or three short plain-text documents through the UI (write them to a temporary folder outside the repo first and use `browser_file_upload`). Run `just dev worker` so they get preprocessed. Sentence splitting and other ML steps use the shared hosted services; wait until the documents' sentences exist (`GET /sdoc/data/{sdoc_id}` returns `tokens`, `token_character_offsets` and sentences).
- Span annotations: `PUT /span` with `sdoc_id`, `code_id`, `begin` / `end` (character offsets) and `begin_token` / `end_token` (from `token_character_offsets`) and `span_text`.
- Sentence annotations: `PUT /sentence` with `sdoc_id`, `code_id`, `sentence_id_start`, `sentence_id_end`.
- Tags: `PUT /tag`, then `PATCH /tag/bulk/link` with `source_document_ids` and `tag_ids`.

Check the exact request bodies in the API docs at `http://localhost:<UVICORN_PORT>/docs` if a call is rejected. Write seed scripts to your scratchpad, not into the repository. Design the data so that the cases your feature must handle actually occur.

## 4. Click through

- Navigate to the feature and use `browser_snapshot` to read the page (prefer it over screenshots for finding elements and text).
- Element refs from a snapshot go stale whenever the page re-renders. Take a fresh snapshot before each interaction, or use role-based selectors (e.g. `role=combobox[name="Codes"]`), which survive re-renders.
- If a page hangs on "Loading DATS…" or fails with `ERR_NETWORK_CHANGED` after rapid reloads, reload it once.
- Exercise the main path of the change and at least one edge case (empty state, error, many items).
- Check `browser_console_messages` for errors and `browser_network_requests` for failed API calls.
- Take a `browser_take_screenshot` of each important state when it helps the review. Always give an **absolute** file name inside this worktree's `.playwright-mcp/` folder (relative names resolve against the MCP server's own working directory, which may be another checkout). The folder is git-ignored; never commit screenshots.

## 5. Report and clean up

- Close the browser (`browser_close`) and stop the dev servers you started.
- In your report and the PR description, list what you clicked through, what worked, and anything broken or not checked.
