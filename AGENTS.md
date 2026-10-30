# Project Overview

DATS is a collaborative web application that allows research teams to manage, search, annotate, analyze and interpret research materials.

## Folder Structure

- `/frontend`: React + TypeScript web application (Vite, MUI).
- `/backend`: FastAPI server with SQLAlchemy ORM and background workers.
- `/ray`: Ray Serve service hosting the ML inference models.
- `/docker`: Docker compose configurations for development and production.
- `/docs`: mkdocs documentation.
- `/tools`: Various scripts.

## Commands

All developer commands run through **just** — the root `justfile` is the single source of truth (it delegates to `bin/`).
Run `just --list` to see all available commands.

| Command                                               | Purpose                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `just bootstrap <project_name> <port_prefix>`         | First-time setup: folders, .env files, dependencies                |
| `just docker up\|down\|logs\|ps`                      | Manage backing services (postgres, redis, weaviate, elasticsearch) |
| `just dev backend\|worker\|frontend\|ray`             | Start a dev server (prefix `DEBUG=true` for debugpy attach)        |
| `just test backend [args]`                            | Run backend tests (extra args forwarded to pytest)                 |
| `just lint\|format\|typecheck backend\|frontend\|ray` | Lint / format / typecheck a component                              |
| `just precommit`                                      | Run all pre-commit hooks over all files                            |
| `just update-api`                                     | Regenerate the frontend API client from the running backend        |
| `just alembic migrate\|check\|revision "msg"`         | Database migrations                                                |
| `just worktree-up [--no-services] [branch]`           | Create/set up a worktree with its own isolated dev stack           |
| `just worktree-down [branch] [--force]`               | Remove a worktree, its docker stack and volumes                    |
| `just doctor check\|heal [args]`                      | Find / heal inconsistencies between the data stores                |

## Architecture

Client-server app. In development, we run the application processes ourselves (`just dev …`), the data services run in Docker (`just docker up`), and the external services are hosted in our infrastructure (or run locally via `just dev ray` / separate compose files).

- **Frontend** — React/Vite dev server; talks to the backend via an OpenAPI-generated client (`frontend/src/api`)
- **Backend** — FastAPI server (`uvicorn --reload`); runs DB migrations automatically on start. Talks to Docker & External services.
- **Worker** — RQ (Redis Queue) worker pool; CPU, API, and GPU job queues. Dequeues jobs from Redis and talks to Docker & External services.
- **Docker services** (data services):
  - **PostgreSQL** — main storage (`backend/src/repos/db/sql_repo.py`)
  - **Redis** — task queue (`backend/src/repos/redis_repo.py`)
  - **Weaviate** — vector storage (`backend/src/repos/vector/weaviate_repo.py`)
  - **Elasticsearch** — text search (`backend/src/repos/elastic/elastic_repo.py`)
- **External services** (over HTTP):
  - **Ray** — Ray Serve hosting ML inference models: spacy, clip, coref, detr, glotlid, quote, whisper (`backend/src/repos/ray/ray_repo.py`)
  - **vLLM** — LLM and embedding inference, OpenAI-compatible API (`backend/src/repos/llm_repo.py`)
  - **Docling** — document conversion (`backend/src/repos/docling_repo.py`)

Ports follow a prefix scheme: `<port_prefix>00` = frontend, `<port_prefix>20` = API.

## Working in Git Worktrees

Each worktree has its own isolated dev stack (own compose project, own port block, own databases). Ray, vLLM and Docling are shared hosted services and are never started locally.

- First thing in a fresh worktree: run `just worktree-up` (inside an existing linked worktree) or `just worktree-up <branch>` (from the main checkout, creates the worktree). It clones the env files from the main checkout, installs dependencies and starts and verifies postgres, redis, elasticsearch and weaviate. Do not run any other command (tests, dev servers, migrations) before it succeeded.
- If the task needs no running stack (docs, CI, lint and typecheck only), run `just worktree-up --no-services` instead: it installs the dependencies without starting any services. Run `just worktree-up` later to start them.
- Never skip the pre-commit hooks (`git commit --no-verify`). They need the installed dependencies; if one is missing, install it (`just install <component>`) and commit again.
- Use `just` recipes only. Never hardcode ports or hostnames: they live in this worktree's `docker/.env`, `backend/.env` and `frontend/.env`.
- Only touch this worktree's compose project; never run docker commands against other projects or containers.
- Run dev servers (`just dev ...`) in the background and check their logs; do not block on them.
- Tests (`just test backend`) reset the `datstest` database of this worktree's own postgres, which is safe.
- When finished, `just worktree-down` removes the stack, its volumes and the worktree (it refuses on uncommitted or unpushed work).

## Core Concepts

We use the following terms throughout the project:

- **User**: An individual who uses the application.
- **Project**: A collection of source documents, annotations, codes, tags, and memos related to a specific research endeavor.
- **Source Document**: Any document (text, image, audio, video) data that is being analyzed. Short: "sdoc".
- **Metadata**: Information about a source document, such as title, author, date created, etc.
  - **Project Metadata**: Defines the metadata keys that exist within a project, their value types, document type, and description.
  - **Source Document Metadata**: The actual metadata values of a specific document.
- **Tag**: A label assigned to a source document for categorization.
- **Code**: A category used for annotating source documents.
- **Annotation**: A segment of a source document that has been assigned a code.
  - **Span Annotation**: An annotation that applies to a specific span of text within a source document.
  - **Sentence Annotation**: An annotation that applies to an entire sentence within a source document.
  - **Bbox Annotation**: An annotation that applies to a bounding box within an image document.
- **Memo**: A note or comment added to a source document or annotation.

## Workflows

- **API client generation**: the API client (`frontend/src/openapi.json`, `frontend/src/api/core`, `frontend/src/api/services`, `frontend/src/models`) is generated from the backend's OpenAPI spec — never hand-edit it. After changing backend endpoints or DTOs, regenerate with `just update-api` (requires a running backend).
- **SQL Database migrations**: Never write SQL migrations by hand. Change the `*_orm.py` model, then run `just alembic revision "msg"` and `just alembic migrate`. After generating a migration, check whether existing data must be migrated and write the migration code. Production holds live data that may need to be updated.
- **Backend startup**: every entry point (API, worker, setup, migrations, tests) boots DATS with the functions in `backend/src/bootstrap.py`. Change startup there, never in an entry point.
- **Testing**: Backend tests live in `backend/test/`; run them with `just test backend` after changing backend behavior. Tests require a running database and use a separate test database. Slow tests (classifier training, real LLM calls) are skipped by default; select them with `-m training`, `-m llm` or `-m ""`.

## General Guidelines

- Do not install new dependencies.
- Use early returns for readability.
- Emphasize type safety and static analysis; follow the Prettier and Ruff formatting.
- TypeScript: never use `any`, avoid `unknown` unless absolutely necessary, prefer type definitions over type assertions (`as`, `!`).
- React: functional components with hooks; prefix event handlers with `handle` (e.g. `handleClick` for `onClick`); do not import React unless it is used directly.
- Backend: keep endpoints thin and put business logic in services; never expose sensitive information in error messages.

## Further Instructions

Detailed conventions live in `.github/instructions/*.instructions.md` (backend, endpoints, tests, frontend, entity renderers, perspectives). They apply automatically based on the files you touch. Reusable workflows live as skills in `.github/skills/<name>/SKILL.md`.

## Agent Configuration

This repository supports several coding agents from a single source of truth:

- `AGENTS.md` (this file): project-wide instructions. Claude Code (v2.1.277+) reads it directly; do not add a `CLAUDE.md` or `CLAUDE.local.md`, they replace it.
- `.github/instructions/`: file-scoped instructions. Each file declares its scope twice in the frontmatter: `applyTo` (comma-separated globs, GitHub Copilot) and `paths` (YAML list of the same globs, Claude Code). Keep both in sync. Every `.md` file in this folder is loaded as an instruction, so do not put other documents here.
- `.github/skills/`: skills in the shared `SKILL.md` format.
- `.claude/rules` and `.claude/skills` are symlinks to the two folders above. Never edit through them or replace them with copies.
