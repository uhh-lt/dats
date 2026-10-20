---
applyTo: "backend/src/**/*_dto.py"
paths:
  - "backend/src/**/*_dto.py"
---

# Backend DTO Pattern

DTO modules (`*_dto.py`) hold the Pydantic models that cross a boundary: API request/response bodies, CRUD create/update payloads, ORM-to-API read models, and job inputs/outputs. They are the source of the OpenAPI spec and therefore of the generated frontend client, so names, field descriptions and types directly shape the frontend API.

## File Structure

```python
# 1. Imports: stdlib, pydantic, then local DTO modules / repos.db.dto_base / systems.job_system.job_dto
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


# 2. Enums used by the DTOs below (str-valued)
class FooType(str, Enum):
    BAR = "bar"


# 3. CRUD-entity DTOs, in this order (each preceded by its "# Properties ..." comment)
# Properties shared across all DTOs
class FooBaseDTO(BaseModel):
    name: str = Field(description="Name of the Foo")


# Properties for creation
class FooCreate(FooBaseDTO):
    project_id: int = Field(description="Project the Foo belongs to")


# Properties for updating
class FooUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(description="Name of the Foo", default=None)


# Properties for reading (as in ORM)
class FooRead(FooBaseDTO):
    id: int = Field(description="ID of the Foo")
    project_id: int = Field(description="Project the Foo belongs to")
    created: datetime = Field(description="Created timestamp of the Foo")
    updated: datetime = Field(description="Updated timestamp of the Foo")
    model_config = ConfigDict(from_attributes=True)


# 4. Other request/response DTOs (links, stats, results, query parameters)
```

## Rules

### Classes and Fields

- **Pydantic only**: every DTO subclasses `BaseModel` (directly or via another DTO, `JobInputBase`, `JobOutputBase`, `JobRead`, `ObjectIdentifier`, `ElasticSearchModelBase`). No dataclasses or plain classes.
- **Field with description**: declare fields as `name: T = Field(description="...")`; put `default=`/`default_factory=` and constraints (`ge`, `min_length`, `max_length`) inside `Field`. Bare annotations without `Field` are rare deviations.
- **Modern typing**: `T | None`, `list[T]`, `dict[K, V]`; not `Optional`/`List`/`Dict`.
- **Pydantic v2 API**: `model_config = ConfigDict(...)`, `@model_validator(mode="after")`, `@field_validator(..., mode="before")` + `@classmethod`. Never `class Config` or `orm_mode`.
- **Enums**: subclass `(str, Enum)` (or `StrEnum`) with values matching the wire format; define them in the DTO module that owns the concept.
- **Hide secrets**: fields that must not reach the client use `Field(..., exclude=True)` (see `UserRead.password`) or live in a separate public DTO (`PublicUserRead`).

### CRUD-Entity DTOs

- **Naming**: `<Entity>BaseDTO`, `<Entity>Create`, `<Entity>Update`, `<Entity>Read`. `<Entity>` is the full PascalCase entity name used by the ORM (`SpanAnnotation`, `SourceDocument`).
- **BaseDTO**: holds only fields shared by Create and Read. Omit it when the two share nothing (`ClusterCreate(BaseModel)`, `DocumentAspectCreate(BaseModel)`).
- **Create**: extends `<Entity>BaseDTO` and adds required foreign keys (`project_id`, ...). Use `pass` when nothing is added.
- **CreateIntern**: when the server fills in fields the client must not send (`project_id`, `user_id`, `uuid`, serialized `content`), the endpoint takes `<Entity>Create` and the service builds `<Entity>CreateIntern` for the CRUD layer. Same for `<Entity>UpdateIntern`.
- **Update**: `class <Entity>Update(BaseModel, UpdateDTOBase)`, not derived from BaseDTO. Every field is `T | None = Field(..., default=None)` and repeats the description of the matching BaseDTO field.
- **UpdateBulk**: `<Entity>UpdateBulk` extends `<Entity>Update` and adds `<entity>_id: int`. Because the id is always set, it adds its own `@model_validator(mode="after")` that requires one updatable field in `self.model_fields_set` (see `FolderUpdateBulk`, `MemoUpdateBulk`).
- **Read**: extends `<Entity>BaseDTO`, adds `id`, the foreign keys, `created`/`updated` (and `memo_ids`/`group_ids` where the ORM exposes them), and ends with `model_config = ConfigDict(from_attributes=True)` so services can call `<Entity>Read.model_validate(orm)`. If a column is stored serialized, parse it with a `@field_validator(..., mode="before")` (see `WhiteboardRead.content`).
- **Validation in the DTO**: cross-field update rules (e.g. "all span resize fields together", "field X must not be explicitly null") go in a `@model_validator(mode="after")` that inspects `self.model_fields_set`, not in the service.

### Job DTOs

- **Input**: `<Feature>JobInput(JobInputBase)` (inherits `project_id`). Put type-specific options in `<Variant>Params(BaseModel)` classes, each with a `<feature>_job_type: Literal[<Feature>JobType.X]` tag. The input holds them as a union field with `Field(..., discriminator="<feature>_job_type")`.
- **Output**: `<Feature>JobOutput(JobOutputBase)`. Like the input, it may be a discriminated union of per-variant `...Output`/`...Result` models.
- **Read** (only when the module exposes a typed job read): `<Feature>JobRead(JobRead[<Feature>JobInput, <Feature>JobOutput])` (all current ones pass `None` as output type) that narrows `job_type: Literal["<type>"] = Field(description="Type of the job", json_schema_extra={"enum": ["<type>"]})`.

### Request/Response and Storage DTOs

- **Analysis request/response**: plain `BaseModel`s named after their role: `...Params`/`...QueryParameters`/`...Request` for inputs, `...Result`/`...Stat`/`...Hit`/`...Row` for outputs. No `from_attributes` unless built from an ORM.
- **Vector identifiers**: `*_embedding_dto.py` defines `<X>ObjectIdentifier(ObjectIdentifier)` with ID fields and a `__str__` that returns a stable key (`f"sdoc_{self.sdoc_id}"`).
- **Elasticsearch documents** extend `ElasticSearchModelBase`/`ElasticSearchDocument` from `repos.elastic.elastic_dto_base`.

### Dependencies

- **Allowed imports**: pydantic, stdlib, `common.*`, other `*_dto` modules, `repos.db.dto_base`, `repos.vector.weaviate_models`, `repos.elastic.elastic_dto_base`, `systems.job_system.job_dto`.
- **Forbidden imports**: `*_orm`, `*_crud`, `*_service`, `*_repo`, `*_endpoint` (enforced by `backend/lint/check_dtos.py` for orm/service/repo/endpoint). If a DTO method needs an ORM type, import it under `if TYPE_CHECKING:` only (see `search_view_dto.py`).
- **Logic**: no DB or service access. Methods are limited to validators, `__str__`, and small pure converters/classmethods.

### Known Pitfall

- `UpdateDTOBase` does **not** reject empty updates: its validator iterates the model, which yields `(name, value)` tuples that are always truthy, so `FooUpdate()` validates. Still inherit it for consistency. When an empty or null update must be rejected, add an explicit `model_fields_set` validator as `SpanAnnotationUpdate`/`MemoUpdate` do.

## Examples

See:

- [code_dto.py](backend/src/core/code/code_dto.py): a complete CRUD-entity DTO set (BaseDTO/Create/Update/Read).
- [folder_dto.py](backend/src/core/doc/folder_dto.py): enum, field constraints, and `UpdateBulk` with its own validator.
- [export_job_dto.py](backend/src/modules/eximport/export_job_dto.py): job input with discriminated `Params` and a job output.
