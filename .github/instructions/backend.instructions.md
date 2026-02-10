---
applyTo: "backend/**/*.py"
---

# Info

The backend is built using Python with FastAPI as the web framework.
It provides RESTful API endpoints for the frontend to interact with.
It follows a modular architecture, separating concerns into different folders and files.

## Libraries and Frameworks

Dependencies are listed in pyproject.toml and managed with uv.

- FastAPI for building the API (REST endpoints)
- SQLAlchemy for database interactions
- Alembic for database migrations
- Pydantic for data validation
- Omegaconf for configuration management
- Loguru for logging

## Databases

The backend works with multiple databases:

- PostgreSQL as the primary relational database
- Weaviate for vector storage and similarity search
- Elasticsearch for full-text search capabilities
- Filesystem storage for storing uploaded files

## Folder Structure

- `/backend/configs`: Configuration files for different environments
- `/backend/src`: Main application code
  - `/common`: Utility functions and helpers
  - `/core`: Core application logic. All core concepts are implemented here.
  - `/migrations`: Alembic database migrations
  - `/modules`: Application logic organized by feature. Modules use core services and systems to implement features.
  - `/repos`: Connections to external services, e.g., databases, file storage, etc.
  - `/systems`: Reusable systems that can be plugged into application logic
- `/backend/tests`: Test cases for the backend code

The codebase uses strict architectural layers enforced by linters:

**Rules**:
- Core CANNOT import from modules
- DTOs CANNOT import services, repos, ORMs, or endpoints
- Endpoints can ONLY import DTOs from their own folder

**Reference**: [check_core.py](backend/lint/check_core.py)

## File Naming Conventions

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

## Code Style & Formatting
Coding guidelines for writing Python code across all `.py` files in this repository.

### Import Organization

Organize imports in three groups using isort-compatible ordering (enforced by ruff):

1. Standard library imports
2. Third-party imports
3. Local application imports (absolute imports preferred)

Use `TYPE_CHECKING` to avoid circular imports:

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
```

**Reference**: [code_orm.py](backend/src/core/code/code_orm.py)

### Type Hints

- Use modern Python 3.11+ syntax: `list`, `dict`, `Type | None` (PEP 604 union operator)
- SQLAlchemy ORM fields use `Mapped[]` type annotations
- Add type hints to all function signatures and class attributes
- No runtime type checking required

```python
def read_by_names(
    self, db: Session, project_id: int, names: list[str]
) -> list[CodeORM]:
    # implementation
```

### Naming Conventions

- **Variables/Functions**: `snake_case` (e.g., `project_id`, `read_by_names`)
- **Classes**: `PascalCase` (e.g., `CodeORM`, `CodeCreate`, `CRUDCode`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `SYSTEM_USER_ID`, `BATCH_SIZE`)
- **Private/Internal**: Leading underscore `_internal_helper` for internal functions

### Code Formatting

- Enforced by ruff with black-compatible formatting
- No trailing whitespace
- Newline at end of file
- Follow existing codebase line length patterns

## Architecture Patterns

### ORM Pattern (SQLAlchemy 2.0)

All ORMs inherit from `ORMBase` and use modern SQLAlchemy 2.0 `Mapped[]` syntax:

```python
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

class CodeORM(ORMBase):
    # Primary key with index
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Required fields
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # Optional fields (use Type | None)
    description: Mapped[str | None] = mapped_column(String)

    # Auto-generated timestamps
    created: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )

    # Foreign keys with cascade delete
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships with explicit cascades
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="codes")
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
```

**Key patterns**:
- Table names auto-generated from class name (strips "ORM" suffix)
- Use `Mapped[]` for type-safe columns
- Explicit cascade rules: `cascade="all, delete-orphan"`, `passive_deletes=True`
- Index frequently queried foreign keys

**Reference**: [code_orm.py](backend/src/core/code/code_orm.py), [orm_base.py](backend/src/repos/db/orm_base.py)

### DTO Pattern (Pydantic)

Use three-tier DTO pattern for data validation:

```python
from pydantic import BaseModel, Field, ConfigDict
from repos.db.dto_base import UpdateDTOBase

# 1. BASE DTO - Shared properties
class CodeBaseDTO(BaseModel):
    name: str = Field(description="Name of the Code")
    color: str = Field(description="Color of the Code")
    enabled: bool = Field(default=True, description="...")

# 2. CREATE DTO - For creation, includes required relationships
class CodeCreate(CodeBaseDTO):
    project_id: int = Field(description="Project the Code belongs to")
    color: str = Field(default_factory=get_next_color)
    is_system: bool = Field(description="Is the Code a system code")

# 3. UPDATE DTO - All fields optional, extends UpdateDTOBase
class CodeUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(default=None)
    color: str | None = Field(default=None)
    parent_id: int | None = Field(default=None)

# 4. READ DTO - Matches ORM structure, for API responses
class CodeRead(CodeBaseDTO):
    id: int = Field(description="ID of the Code")
    project_id: int
    created: datetime

    model_config = ConfigDict(from_attributes=True)  # Enable ORM conversion
```

**Key patterns**:
- Create DTOs specify defaults and required fields
- Update DTOs must extend `UpdateDTOBase` (validates at least one field is set)
- Read DTOs use `from_attributes=True` for automatic ORM conversion
- Use `Field()` with descriptions for OpenAPI documentation

**Reference**: [code_dto.py](backend/src/core/code/code_dto.py), [dto_base.py](backend/src/repos/db/dto_base.py)

### CRUD Pattern

CRUD classes inherit from `CRUDBase[ORMType, CreateDTOType, UpdateDTOType]` and follow strict method ordering enforced by linters:

1. `create*` methods
2. `read*` methods
3. `update*` methods
4. `delete*` methods
5. Other methods

```python
from repos.db.crud_base import CRUDBase
from core.code.code_orm import CodeORM
from core.code.code_dto import CodeCreate, CodeUpdate

class CRUDCode(CRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    ### CREATE OPERATIONS ###
    def create(self, db: Session, *, create_dto: CodeCreate) -> CodeORM:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    ### READ OPERATIONS ###
    def read_by_name(self, db: Session, code_name: str) -> list[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name).all()

    def read_by_project(self, db: Session, *, proj_id: int) -> list[CodeORM]:
        return db.query(self.model).filter(self.model.project_id == proj_id).all()

    ### UPDATE OPERATIONS ###
    # Inherited from CRUDBase

    ### DELETE OPERATIONS ###
    # Inherited from CRUDBase
```

**Base CRUD methods** available from `CRUDBase`:
- `read(db, id)` - Read single with error handling
- `read_by_ids(db, ids)` - Batch read maintaining order
- `read_multi(db, skip, limit)` - Paginated read
- `exists(db, id)` - Existence check
- `create(db, create_dto)` - Generic creation
- `update(db, id, update_dto)` - Generic update with validation
- `delete(db, id)` - Generic deletion

**Reference**: [code_crud.py](backend/src/core/code/code_crud.py), [crud_base.py](backend/src/repos/db/crud_base.py), [check_crud.py](backend/lint/check_crud.py)

### Service Layer Pattern

Services contain business logic and orchestrate multiple CRUD operations:

```python
from sqlalchemy import func
from sqlalchemy.orm import Session

def compute_tag_statistics(
    db: Session, sdoc_ids: set[int], top_k: int = 20
) -> list[TagStat]:
    """Compute tag statistics for given source documents."""
    # Business logic combining multiple queries
    count = func.count().label("count")

    filtered_query = (
        db.query(TagORM, count)
        .join(SourceDocumentTagLinkTable)
        .filter(SourceDocumentTagLinkTable.source_document_id.in_(list(sdoc_ids)))
        .group_by(TagORM.id)
        .order_by(count.desc())
        .limit(top_k)
    )

    global_query = (
        db.query(TagORM.id, count)
        .join(SourceDocumentTagLinkTable)
        .filter(TagORM.id.in_([tag.id for tag, _ in filtered_res]))
        .group_by(TagORM.id)
    )

    # Combine results
    return [
        TagStat(tag=tag, filtered_count=fcount, global_count=gcount)
        for (tag, fcount), (tid, gcount) in zip(filtered_res, global_res)
    ]
```

**Key patterns**:
- Services coordinate multiple CRUD operations
- Contain complex business logic that doesn't belong in CRUD
- Return DTOs or domain-specific types
- Handle transaction boundaries when needed

**Reference**: [statistics_service.py](backend/src/modules/statistics/statistics_service.py)

## FastAPI Patterns

### Endpoint Organization

One router per endpoint file with consistent structure:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from common.dependencies import get_db_session, get_current_user
from core.auth.authz_user import AuthzUser
from core.code.code_dto import CodeRead, CodeCreate

router = APIRouter(
    prefix="/code",
    dependencies=[Depends(get_current_user)],  # Global auth requirement
    tags=["code"],
)

@router.post(
    "",
    response_model=CodeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new code",
)
def create_code(
    *,
    db: Session = Depends(get_db_session),
    create_dto: CodeCreate,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    """Create a new code in the project."""
    authz_user.assert_in_project(create_dto.project_id)
    db_code = crud_code.create(db=db, create_dto=create_dto)
    return db_code
```

**Key patterns**:
- Router prefix matches resource name (plural)
- Global dependencies for authentication
- Tags for OpenAPI grouping
- Explicit response models and status codes
- Summary and docstrings for documentation

### Dependency Injection

Standard dependencies used throughout:

```python
from fastapi import Depends
from sqlalchemy.orm import Session

from common.dependencies import get_db_session, get_current_user, skip_limit_params
from core.auth.authz_user import AuthzUser
from core.user.user_orm import UserORM

# Database session
db: Session = Depends(get_db_session)

# Current authenticated user
user: UserORM = Depends(get_current_user)

# Authorization helper (also injects user + db)
authz_user: AuthzUser = Depends()

# Pagination parameters
params: dict[str, int] = Depends(skip_limit_params)
```

### Authorization Pattern

Use `AuthzUser` for project-based authorization:

```python
from core.auth.authz_user import AuthzUser
from common.crud_enum import Crud

@router.get("/{code_id}")
def get_code(
    *,
    code_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    # Check user is in same project as code
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    code = crud_code.read(db, code_id)
    return code
```

**AuthzUser methods**:
- `assert_in_project(project_id: int)` - Verify user is project member
- `assert_in_same_project_as(crud: Crud, object_id: int)` - Verify user can access object
- Automatically raises `ForbiddenError` (HTTP 403) on failure

**Reference**: [authz_user.py](backend/src/core/auth/authz_user.py)

## Error Handling

### Exception Decorator Pattern

Use decorator-based exception handling for consistent HTTP responses:

```python
from common.exception_handler import exception_handler
from fastapi import status

@exception_handler(status.HTTP_404_NOT_FOUND)
class NoSuchElementError(Exception):
    def __init__(self, model: Type[ORMModelType], **kwargs):
        self.model = model
        self.model_name = model.__name__.replace("ORM", "")
        super().__init__(f"There exists no {self.model_name} with: {kwargs}!")

@exception_handler(status.HTTP_403_FORBIDDEN)
class ForbiddenError(Exception):
    def __init__(self):
        super().__init__("User is not authorized")

@exception_handler(status.HTTP_409_CONFLICT)
class DuplicateError(Exception):
    def __init__(self, model: Type[ORMModelType], **kwargs):
        super().__init__(f"Duplicate {model.__name__}: {kwargs}")
```

**Usage**:
```python
# Exceptions automatically converted to proper HTTP responses with logging
if not obj:
    raise NoSuchElementError(CodeORM, id=code_id)

if not authz_user.in_project(project_id):
    raise ForbiddenError()
```

**Reference**: [exception_handler.py](backend/src/common/exception_handler.py)

## Database Patterns

### Query Patterns

Use SQLAlchemy ORM with explicit joins and filters:

```python
def read_by_project_and_tag(
    self, db: Session, *, proj_id: int, tag_id: int
) -> list[SourceDocumentORM]:
    """Read source documents by project and tag."""
    return (
        db.query(self.model)
        .join(SourceDocumentORM, TagORM.source_documents)
        .filter(
            self.model.project_id == proj_id,
            TagORM.id == tag_id,
        )
        .order_by(self.model.created.desc())
        .all()
    )
```

### Batch Operations

Use configurable batch size for large operations:

```python
from config import conf

BATCH_SIZE = conf.postgres.batch_size  # From config

def process_in_batches(db: Session, ids: list[int]) -> None:
    """Process IDs in batches to avoid memory issues."""
    for i in range(0, len(ids), BATCH_SIZE):
        batch_ids = ids[i : i + BATCH_SIZE]
        batch_objects = (
            db.query(self.model)
            .filter(self.model.id.in_(batch_ids))
            .all()
        )
        # Process batch
        db.commit()  # Commit per batch
```

### Transaction Handling

Explicit commits in CRUD with rollback on error:

```python
def create(self, db: Session, *, create_dto: CreateDTO) -> ORM:
    """Create new database object."""
    try:
        db_obj = self.model(**jsonable_encoder(create_dto))
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Database error during creation: {}", e)
        raise
```

## Enums and Constants

### String Enums

Inherit from `str, Enum` for JSON serialization:

```python
from enum import Enum

class DocType(str, Enum):
    """Document type enumeration."""
    text = "text"
    image = "image"
    video = "video"
    audio = "audio"
```

**Key pattern**: Multiple inheritance from `str` and `Enum` ensures proper JSON serialization

### Constants

```python
# Module-level constants
SYSTEM_USER_ID: int = 1
ASSISTANT_ZEROSHOT_ID: int = 9990

# Config-driven constants
from config import conf

BATCH_SIZE = conf.postgres.batch_size
MAX_UPLOAD_SIZE = conf.api.max_upload_size_mb * 1024 * 1024
```

## Additional Patterns

### Logging

Use `loguru` for structured logging:

```python
from loguru import logger

# Info logging
logger.info("Processing started for project {}", project_id)

# Error logging with context
logger.error("Failed to process document {}: {}", doc_id, error)

# Debug logging (filtered by log level in production)
logger.debug("Query results: {}", results)

# Warning for recoverable issues
logger.warning("Deprecated API usage detected: {}", endpoint)
```

### Job Registration Pattern

Use decorator-based job registration for background tasks:

```python
from modules.jobs.job_decorator import register_job
from modules.jobs.job_dto import JobType, EndpointGeneration, JobTiming

@register_job(
    job_type=JobType.ML,
    input_type=MLJobInput,
    generate_endpoints=EndpointGeneration.ALL,
    device="api",
    result_ttl=JobTiming.NINETY_DAYS,
)
def ml_job(payload: MLJobInput, job: Job) -> None:
    """Execute ML job based on type."""
    match payload.ml_job_type:
        case MLJobType.QUOTATION_ATTRIBUTION:
            QuoteService().perform_quotation_detection(...)
        case MLJobType.TAG_RECOMMENDATION:
            DocumentClassificationService().classify_untagged_documents(...)
        case _:
            raise ValueError(f"Unknown job type: {payload.ml_job_type}")
```

**Key concepts**:
- Jobs auto-registered via decorator
- Type-safe input via Pydantic
- Match/case pattern for job routing
- Configurable TTL and device assignment

**Reference**: [ml_job.py](backend/src/modules/ml/ml_job.py)

## Configuration Management

Use OmegaConf for hierarchical configuration:

```python
from omegaconf import OmegaConf

# Load configuration
conf = OmegaConf.load("configs/development.yaml")

# Type-safe access
db_host = conf.postgres.host
batch_size = conf.postgres.batch_size
```

**Reference**: [config.py](backend/src/config.py)
