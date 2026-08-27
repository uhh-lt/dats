# Project Overview

This project is a web application that allows users to manage, search, annotate, analyze and interprete reseach materials.

## Folder Structure

- `/frontend`: Contains the source code for the frontend.
- `/backend`: Contains the source code for the backend.
- `/ray`: Contains the source code for the ray service.
- `/docker`: Contains the docker configurations.
- `/docs`: Contains the mkdocs documentation.
- `/tools`: Contains various scripts.

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

- **API client generation**: `frontend/src/api` is generated from the backend's OpenAPI spec — never hand-edit it. After changing backend endpoints or DTOs, regenerate with `just update-api` (requires a running backend).
- **SQL Database migrations**: Never write SQL migrations by hand. Change the `*_orm.py` model, then run `just alembic revision "msg"` and `just alembic migrate`. After generating a migration, check whether existing data must be migrated anc write the migration code. Production holds live data that may need to be updated.
- **Testing**: Backend tests live in `backend/test/`; run them with `just test backend` after changing backend behavior. Tests require a running database and use a separate test database.

## Further Instructions

Detailed per-stack conventions live in `.github/instructions/` (backend, frontend, tests, renderers, perspectives) and apply based on the files you touch.
