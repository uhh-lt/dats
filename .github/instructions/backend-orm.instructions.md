---
applyTo: "backend/src/**/*_orm.py"
paths:
  - "backend/src/**/*_orm.py"
---

# Backend ORM Pattern

`*_orm.py` modules define the SQLAlchemy 2.0 models that make up the PostgreSQL schema. Every file matching `*_orm.py` is auto-imported by `import_by_suffix("_orm.py")` in [sql_repo.py](backend/src/repos/db/sql_repo.py), so a new model needs no manual registration. Alembic autogenerates migrations from these classes, and `AuthzUser` and the websocket system call `get_project_id()` on them. Keep them uniform so that migrations, cascades and authorization behave the same way for every entity. [check_orm.py](backend/lint/check_orm.py) enforces the mechanical rules below (`just lint backend`, pre-commit hook `lint-backend-orm`; `--help` lists them).

## File Structure

```python
# 1. Imports: stdlib (datetime), sqlalchemy, sqlalchemy.orm, then local (ORMBase last)
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

# 2. Related ORMs, imported only for type checking
if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


# 3. Main entity class: <Entity>ORM -> table name "<entity>" (lowercased, "ORM" removed)
class WhiteboardORM(ORMBase):
    # 3a. Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # 3b. Plain columns, created / updated timestamps
    title: Mapped[str] = mapped_column(String, nullable=False, index=False)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # 3c. Relationships, grouped by kind with a comment:
    # one to one / many to one / one to many / many to many / hierarchy reference
    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="whiteboards"
    )

    # 3d. Table-level constraints (only if needed)
    __table_args__ = (
        UniqueConstraint("project_id", "title", name="UC_<...>_unique_per_project"),
    )

    # 3e. Derived @property values (memo_ids, sdoc_id, user_id, ...)

    # 3f. Authorization hook, always the last member
    def get_project_id(self) -> int:
        return self.project_id


# 4. Association tables for many-to-many relationships: <A><B>LinkTable
class SourceDocumentTagLinkTable(ORMBase):
    source_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    # tag_id: same shape
```

## Rules

### Naming

- **Class name**: entity classes are `<Entity>ORM`. Pure many-to-many association tables are `<A><B>LinkTable` (e.g. `SourceDocumentTagLinkTable`). Association objects that carry extra columns are still `<Entity>ORM` (e.g. `DocumentAspectORM`).
- **Table name**: never set `__tablename__`. `ORMBase` derives it from the class name (`SpanAnnotationORM` → `spanannotation`, `SourceDocumentTagLinkTable` → `sourcedocumenttaglinktable`). Use that derived name in every `ForeignKey("<table>.id")` and `secondary=` string.
- **`secondary=`**: write it as `"<ClassName>".lower()` (e.g. `secondary="SourceDocumentTagLinkTable".lower()`), so it can be found by searching for the class name.
- **FK columns**: `<relationship>_id` sits directly above the relationship it backs (`code_id` → `code`, `project_id` → `project`).
- **Constraint names**: unique constraints are `UC_<what>` (e.g. `UC_code_name_unique_per_project`). Check constraints are `CC_<what>`.

### Columns

- **Typed mapping**: every column is `name: Mapped[<py type>] = mapped_column(<SA type>, ...)` with the SQLAlchemy type passed explicitly. Never use legacy `Column(...)` or leave out `Mapped[...]`.
- **Nullability**: the annotation decides. `Mapped[T]` is `NOT NULL` (`nullable=False` is common and allowed), `Mapped[T | None]` is nullable. Never pass `nullable=True`. The annotation must match the database, so callers handle `None` for optional columns.
- **Primary key**: `id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)`. Variations that are allowed:
  - Dependent 1:1 tables use the parent FK as their `id` (`SourceDocumentDataORM`, `SourceDocumentJobStatusORM`).
  - Association tables use a composite primary key made of their FKs, with no `id` column.
- **Timestamps**: always `DateTime(timezone=True)`. `created` uses `server_default=func.now()` and `index=True`. `updated` also sets `onupdate=func.current_timestamp()`.
- **Defaults**: use `server_default` (a string, or `text(...)` for JSONB), so the default also lands in the migration. Python-side `default=` appears only for booleans in the perspectives module.
- **Enums**: store an enum as `String` or `Integer`, annotated with the enum type (`folder_type: Mapped[FolderType] = mapped_column(String, ...)`). The column holds the member value (`"sdoc_folder"`). Never use a native `Enum(...)` column type.
- **JSON**: store structured values as `JSONB` (or Postgres `ARRAY`), never as JSON text in a `String` column (only `MemoORM.content_json` does, because the API passes the editor state through as an opaque string). Annotate with JSON-compatible types (`Mapped[dict[str, Any]]`, `Mapped[list[dict[str, Any]]]`) and add a comment that names the DTO. Columns with a server default use `JSONB(none_as_null=True)` and `server_default=text("'[]'::jsonb")`, so a `None` from an Intern DTO falls back to the default instead of storing JSON `null`. Writers pass `jsonable_encoder(...)` / `model_dump(mode="json")` output; Read DTOs validate the value without extra validators (see `cota_orm.py`).

### Foreign Keys & Relationships

- **FK cascade**: every FK column, including link-table and composite-key columns, uses `ForeignKey("<table>.id", ondelete="CASCADE")` and `index=True`. The only exception is `ondelete="SET NULL"` on an optional column (`ClusterORM.parent_cluster_id`).
- **Relationship form**: `relationship("<TargetORM>", back_populates="<attr>", ...)`. Pass the target as a string, and give the annotation as a string as well (`Mapped["CodeORM"]`, `Mapped[list["CodeORM"]]`).
- **`back_populates` both ways**: when the other side declares the inverse relationship, both sides name each other with `back_populates`. Never use `backref`.
- **Parent side of one-to-many / one-to-one**: `cascade="all, delete-orphan", passive_deletes=True`. Together with `ondelete="CASCADE"`, the database does the deleting. Exceptions: `ClusterORM.child_clusters` (children survive via `SET NULL`) and the shared lookup `SpanTextORM.span_annotations` (only `passive_deletes=True`).
- **One to one**: add `uselist=False` on the parent side (e.g. `object_handle`, `data`).
- **Many to many**: `secondary=...` plus `back_populates`, usually with `passive_deletes=True`. When both an association-object relationship and a `secondary` shortcut map the same table, add `overlaps="..."` (see `aspect_orm.py`).
- **Hierarchies** (code, tag, folder): `parent_id: Mapped[int | None]` is a self-FK. `parent: Mapped["<Self>ORM | None"] = relationship("<Self>ORM", remote_side=[id], back_populates="children")`. `children` has `back_populates="parent"` and the parent-side cascade.
- **Ambiguous FKs**: pass `foreign_keys="<table>.c.<column>"` when two FKs connect the same tables (`MemoORM` ↔ `ObjectHandleORM`).
- **Inverse side**: adding a relationship to an existing model also means adding the inverse relationship and the `TYPE_CHECKING` import in the target ORM file (e.g. a new project-scoped entity adds a list to `ProjectORM`).

### Imports

- **Related ORMs go under `TYPE_CHECKING`**: this avoids circular imports. Never import another ORM at runtime.
- **Allowed runtime imports**: `sqlalchemy`, `ORMBase`, enums from `*_enum.py` files (e.g. `FolderType` from `folder_enum.py`, `ClassifierModel` from `classifier_enum.py`), constants and value types from `common/` or from the module's own `*_dto.py` (e.g. `PROCESSING_JOBS`, `WordLevelTranscription`). Never import CRUDs, services, endpoints or repos (other than `orm_base`). Core ORMs never import from `modules/` ([check_core.py](backend/lint/check_core.py)), so constants they need live in `common/`.

### Table Arguments

- **`__table_args__`**: a tuple placed after all columns and relationships. It holds `UniqueConstraint(..., name="UC_...")`, `CheckConstraint(..., name="CC_...")` and composite `Index(...)` entries.
- **Project-scoped uniqueness**: entities with a user-facing name or uuid are unique per project (`UniqueConstraint("project_id", "name", ...)`).

### Behavior

- **`get_project_id()`**: every project-scoped model overrides it. Return `self.project_id` when the column exists. Otherwise delegate to the parent, e.g. `return self.source_document.get_project_id()`. Only user-scoped tables (`ApiKeyORM`, `RefreshTokenORM`), `SpanTextORM` and pure link tables skip it; `UserORM` returns `None`.
- **`get_user_id()`**: never override it. `ORMBase` reads the `user_id` attribute, so a model that is owned through its parent exposes `user_id` as a `@property` (see `SpanAnnotationORM.user_id`).
- **`memo_ids`**: models that own an `object_handle` expose the same `memo_ids` property (copy it from `code_orm.py`).
- **Derived values**: `@property` (or `hybrid_property` when the value must be usable in SQL queries) is used for convenience accessors that DTOs read through `from_attributes`. Keep them free of queries and side effects.
- **`__repr__`**: optional, used only in the perspectives module.

## Examples

See:

- [code_orm.py](backend/src/core/code/code_orm.py): project-scoped entity with timestamps, object handle, one-to-many with cascades, hierarchy, unique constraint, `memo_ids` and `get_project_id`.
- [tag_orm.py](backend/src/core/tag/tag_orm.py): many-to-many through a `<A><B>LinkTable` in the same file.
- [cota_orm.py](backend/src/modules/concept_over_time_analysis/cota_orm.py): JSONB documents with JSONB server defaults.
- [word_frequency_orm.py](backend/src/modules/word_frequency/word_frequency_orm.py): minimal dependent table with a composite primary key that delegates `get_project_id`.
