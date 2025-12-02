---
applyTo: "backend/**/*.py"
---

## Backend

The backend is built using Python with FastAPI as the web framework.
It provides RESTful API endpoints for the frontend to interact with.
It follows a modular architecture, separating concerns into different folders and files.

### Libraries and Frameworks

Dependencies are listed in pyproject.toml and managed with uv.

- FastAPI for building the API (REST endpoints)
- SQLAlchemy for database interactions
- Alembic for database migrations
- Pydantic for data validation
- Omegaconf for configuration management
- Loguru for logging

### Databases

The backend works with multiple databases:

- PostgreSQL as the primary relational database
- Weaviate for vector storage and similarity search
- Elasticsearch for full-text search capabilities
- Filesystem storage for storing uploaded files

### Folder Structure

- `/backend/configs`: Configuration files for different environments
- `/backend/src`: Main application code
  - `/common`: Utility functions and helpers
  - `/core`: Core application logic. All core concepts are implemented here.
  - `/migrations`: Alembic database migrations
  - `/modules`: Application logic organized by feature. Modules use core services and systems to implement features.
  - `/repos`: Connections to external services, e.g., databases, file storage, etc.
  - `/systems`: Reusable systems that can be plugged into application logic
- `/backend/tests`: Test cases for the backend code

### File Naming Conventions

The purpose of the file is reflected in its name.
We use the following suffixes to indicate file types:
- `*_endpoint.py`: API endpoint definitions

- `*_dto.py`: Pydantic schemas (Data Transfer Objects) for request and response validation of payloads
- `*_orm.py`: SQL Database models and schemas
- `*_crud.py`: CRUD operations for database models (SQL)

- `*_collection.py`: Weaviate collection schemas
- `*_embedding_crud.py`: CRUD operations for embeddings stored in Weaviate

- `*_elastic_index.py`: Elasticsearch index schemas
- `*_elastic_crud.py`: CRUD operations for Elasticsearch indices

- `*_system.py`: Reusable systems that encapsulate specific functionality
- `*_service.py`: Business logic and service layer implementations
- `*_repo.py`: Data access layer and repository implementations
- `*_utils.py`: Utility functions and helpers

### Coding Instructions

When writing backend code, follow these guidelines:

- Use modern type hints (list, dict, etc.) for function signatures and variable declarations.
- Write docstrings for all public functions and classes.
- Use loguru for logging sensible events and errors.
