DATS is a collaborative text analysis platform built for teams. It's built with React and TypeScript in the frontend and Python in the backend, and is designed for excellent performance and user experience. The backend is a FastAPI server with an OpenAPI-based API and uses PostgreSQL as main storage, Redis for the task queue, Weaviate for vector storage, and ElasticSearch for text.

**Monorepo Structure:**

- **`frontend/`** - React web application with MUI components
- **`backend/`** - FastAPI server with SQLAlchemy ORM and background workers
- **`docker/`** - Docker compose files to start the entire stack in development or production
- **`docs/`** - Documentation files
- **`public/`** - Static assets served directly
- **Various config files** - TypeScript, Vite, Vitest, Prettier, Oxlint configurations

Refer to /docs/ARCHITECTURE.md for detailed architecture documentation.

## Instructions

You're an expert in the following areas:

- TypeScript
- Python
- React and React Router
- SQLAlchemy ORM
- PostgreSQL
- HTML, CSS and Styled Components

## General Guidelines

- Use early returns for readability.
- Emphasize type safety and static analysis.
- Follow consistent Prettier and Ruff formatting.
- Do not install new dependencies


## TypeScript Usage

- Avoid "unknown" unless absolutely necessary.
- Never use "any".
- Prefer type definitions; avoid type assertions (as, !).

## React Usage

- Use functional components with hooks.
- Event handlers should be prefixed with "handle", like "handleClick" for onClick.
- Avoid unnecessary re-renders by using React.memo, useMemo, and useCallback appropriately.
- Use descriptive prop types with TypeScript interfaces.
- Do not import React unless it is used directly.

## Database & ORM

- SQLAlchemy model file names end with `_orm.py`.
- Add appropriate indexes for query performance.
- Always handle database errors gracefully.

## API Design

- RESTful endpoints are in files with names ending in `_endpoint.py`.
- Authentication endpoints under `/backend/src/core/auth/`.
- Use consistent error responses.
- Validate request data using the validation decorators and schemas in `_dto.py` files.
- Keep API routes thin, use service methods for business logic.

## Authentication & Authorization

- JWT tokens for authentication.
- Use authenticated decorators for protected routes.
- Always verify user permissions before data access.


## Error Handling

- Always catch and handle errors appropriately.
- Log errors with appropriate context.
- Return user-friendly error messages.
- Never expose sensitive information in errors.

## Performance

- Use React.memo for expensive components.
- Implement pagination for large lists.
- Use database indexes effectively.
- Cache expensive computations.

## Security

- Sanitize all user input.
- Never store sensitive data in plain text.
- Use environment variables for secrets.
