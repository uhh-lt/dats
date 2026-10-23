---
applyTo: "backend/src/**/*_crud.py"
paths:
  - "backend/src/**/*_crud.py"
---

# Backend CRUD Pattern

> **Scope**: SQL CRUDs built on `repos.db.crud_base.SQLCRUDBase`. The glob also matches `*_embedding_crud.py` (Weaviate) and `*_elastic_crud.py` (Elasticsearch). Those follow `backend-embedding-crud.instructions.md` and `backend-elastic-crud.instructions.md` instead, and the rules below do not apply to them.

SQL CRUD modules are the PostgreSQL data-access layer for one ORM entity. Each file defines one `CRUD<Entity>` class on the generic [crud_base.py](backend/src/repos/db/crud_base.py) `SQLCRUDBase` and exports one module-level singleton that services, other CRUDs and endpoints import. CRUDs only read and write; they never commit or roll back. The session owner (`SQLRepo.transaction()`, used by `get_db_session` and job handlers) does.

## File Structure

```python
# 1. Imports: sqlalchemy, own-entity ORM + DTOs, SQLCRUDBase (+ UpdateNotAllowed),
#    NoSuchElementError (repos.db.sql_exceptions), own <module>_exceptions, other crud_* singletons.
from sqlalchemy.orm import Session

from config import conf
from core.code.code_dto import CodeCreate, CodeUpdate
from core.code.code_orm import CodeORM
from repos.db.crud_base import SQLCRUDBase

# 2. Module constants (only if the file batches queries itself)
BATCH_SIZE = conf.postgres.batch_size

# 3. The CRUD class, generic over [ORM, CreateDTO, UpdateDTO]
class CRUDCode(SQLCRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    ### CREATE OPERATIONS ###
    def create_system_codes_for_project(self, db: Session, *, project_id: int) -> list[CodeORM]: ...

    ### READ OPERATIONS ###
    def read_by_name(self, db: Session, *, code_name: str) -> list[CodeORM]:
        """
        Read all codes with the given name.

        Args:
            code_name: The name of the codes.

        Returns:
            The matching codes.
        """
        return db.query(self.model).filter(self.model.name == code_name).all()

    ### UPDATE OPERATIONS ###
    def update_with_children(self, db: Session, *, code_id: int, update_dto: CodeUpdate) -> CodeORM: ...

    ### DELETE OPERATIONS ###
    def delete_by_sdoc(self, db: Session, *, sdoc_id: int) -> list[int]: ...  # as in crud_adoc

    ### OTHER OPERATIONS ###
    def exists_by_name(self, db: Session, *, code_name: str) -> bool: ...


# 4. The singleton: crud_<name> = CRUD<Entity>(<Entity>ORM)
crud_code = CRUDCode(CodeORM)
```

A CRUD with no custom methods is just `class CRUDAspect(SQLCRUDBase[...]):` + `pass` + the singleton.

## Rules

### Naming and Structure

- **Class name**: `CRUD<Entity>` (e.g. `CRUDSpanAnnotation`). Exactly one class whose name starts with `CRUD` per file.
- **Singleton**: `crud_<name> = CRUD<Entity>(<Entity>ORM)` at the bottom of the file. `<name>` is the snake_case entity name; the only allowed abbreviations are `sdoc`, `adoc`, `span_anno`, `sentence_anno`, `bbox_anno`, `sdoc_meta`, `sdoc_data`, `sdoc_job_status`, `project_meta`. Callers import the singleton, never the class.
- **Generic parameters**: `SQLCRUDBase[<Entity>ORM, <Create DTO>, <Update DTO>]`, plus the key type for a composite primary key (see Variations). Use the `...CreateIntern` / `...UpdateIntern` DTO when the ORM needs fields the API DTO lacks; the service builds it (e.g. `SpanAnnotationService` looks up the annotation document, `SearchViewService` serializes the view). If the entity is never updated, use `UpdateNotAllowed` from `crud_base`.
- **Exactly the generic DTOs**: the generic parameters are the CRUD's contract. Overrides of `create` / `create_multi` / `update` / `update_multi` take exactly `create_dto: <Create>` / `create_dtos: list[<Create>]` / `id` + `update_dto: <Update>` / `ids` + `update_dtos: list[<Update>]`, never API DTOs or extra parameters (`user_id`, `codes`). Related rows are linked by their own methods (`crud_classifier.link_codes`).
- **Sections**: group methods under `### CREATE OPERATIONS ###`, `### READ OPERATIONS ###`, `### UPDATE OPERATIONS ###`, `### DELETE OPERATIONS ###`, `### OTHER OPERATIONS ###`, in that order. Omit empty sections, or keep the header with a `# Inherited from <Base>` comment.
- **Verbs**: public method names start with `create`, `read`, `update` or `delete` (their own sections), or with one of the OTHER verbs: `exists`, `search`, `count`, `link`, `unlink`, `set`, `add`, `remove`, `duplicate`, `merge`, `reorder`, `associate`, `dissociate`, `revoke`, `favorite`, `unfavorite`. `add`/`remove` are for association rows only (`add_to_span_group`, `remove_from_span_group`). `get_` and `find_` are forbidden. The list is closed, so reuse an existing verb. Add a new one only when none fits: to `OTHER_VERBS` in `backend/lint/check_crud.py` (with a comment) and to this list. Use `_multi` for list variants and `_by_<field>[_and_<field>]` for lookups (`read_by_hashed_key`, `delete_by_adoc`, `exists_favorite`). Upserts are updates (`crud_memo.update_recent`).
- **CRUDs vs. handlers**: CRUDs use `read_*`, while endpoint handlers use `get_*` (see `backend-endpoint.instructions.md`).
- **Private helpers** (`_name`) are exempt from the verb, order and section rules, but still need a return annotation.
- **Base methods**: `create`, `create_multi`, `read`, `read_by_ids`, `read_multi`, `exists`, `update`, `update_multi`, `delete`, `delete_multi`. Override them instead of adding near-duplicates. (This is SQL-specific: Embedding and Elastic CRUDs must not override their bases.)
- **Single delegates to multi**: the base `create`, `update` and `delete` call `create_multi`, `update_multi` and `delete_multi` with one item. Put extra handling (e.g. adoc timestamps, password hashing) into an override of the `_multi` method that calls `super()`; the single-item path then gets it for free. Never override the single-item method: a caller of the `_multi` method would skip the handling. The only exception carries `# check_crud: allow override-multi (<reason>)` (`object_handle_crud.create`).
- **No `_bulk` methods**: batch operations are the `_multi` methods. Turning API DTOs into CRUD DTOs (annotation documents, ids inside bulk DTOs, per-user state) is orchestration and belongs in a service (`SpanAnnotationService.create_multi`, `MemoService.update_multi`).
- **Lint**: `backend/lint/check_crud.py` enforces these conventions (including `no-bulk`, `generic-dto` and `override-multi`). It runs in `just lint backend` and in the `Lint: Backend CRUD conventions` pre-commit hook (so also in CI).

### Signatures

- `db: Session` is the first parameter after `self`; every parameter after it is keyword-only (`*`), including the base `read(db, *, id)`.
- Project ids are always named `project_id`, never `proj_id`.
- Every method has a return annotation; docstrings use the `Args:` / `Returns:` style.
- Overrides of the base write methods keep the base parameters exactly (see _Exactly the generic DTOs_); other methods name their parameters freely.
- Return ORM objects (`<Entity>ORM`, `list[<Entity>ORM]`, `<Entity>ORM | None`), ids, counts (`int`) or `dict[int, ...]` mappings, never Read DTOs. DTOs are built outside the CRUD: in the module's service if it has one (`whiteboard_service.read_whiteboard_data`), in a module `*_utils.py` when several modules need it (`memo_utils.get_memo_read_dto_from_orm`), otherwise in the endpoint or job (`api_key_endpoint`, `duplicate_finder_job`).

### Session Handling

- **Flush only**: write methods end with `db.flush()` (plus `db.refresh(obj)` when DB-generated values are needed). Never call `db.commit()` or `db.rollback()`.
- **Eager loading for Read DTOs**: when the entity's Read DTO reads relationships (through ORM properties such as `sdoc_id`, `text`, `memo_ids`), override `_load_options()` with `selectinload(...)` options for exactly those relationships, and apply `.options(*self._load_options())` in every read method that returns the entity (`read` and `read_by_ids` do it already). Without it, building N DTOs lazy-loads each relationship once per object (see `span_annotation_crud`; `test/crud/test_annotation_read_dto_loading.py` pins the query count).
- Query with `db.query(...)` and use `self.model` for the own entity; other ORMs/link tables are referenced directly. `select()` with `db.execute` / `db.scalars` is an accepted variation, mainly for batched and aggregate queries.
- Reuse the base: call `super().create_multi/update_multi/delete_multi(...)` or `self.read_by_ids(...)` inside overrides instead of re-implementing them.
- For idempotent inserts, use `sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_nothing()` / `on_conflict_do_update(...)`, or `db.begin_nested()` + catching `IntegrityError` (see `object_handle_crud.create`).

### Batching

- Every `.in_()` over a list that comes from a method argument runs in chunks of `BATCH_SIZE = conf.postgres.batch_size`: `for i in range(0, len(ids), BATCH_SIZE): batch_ids = ids[i : i + BATCH_SIZE]`. Exempt are only:
  - lists built inside the method with a known small bound;
  - the second list of a two-list filter when it is bounded by the project (`code_ids`, `tag_ids`): only the unbounded list (`sdoc_ids`) is chunked (see `crud_span_anno.read_by_user_sdocs_codes`, `crud_tag.count_by_tags_and_sdocs_and_user`);
  - filters that cannot be split into separate queries, such as `notin_(...)` and `.any(... .in_(...))` (see `crud_sdoc.read_all_without_tags`, `crud_sdoc.read_by_tags`).
- Return early on empty input (`if not ids: return []` / `return 0` / `return {}`).
- Bulk deletes use `delete(Model).where(...)` via `db.execute`, `assert isinstance(result, CursorResult)` and sum `result.rowcount` (see `SQLCRUDBase.delete_multi`).
- **Input order**: every batch method returns its results in the order of its input (`create_dtos`, `ids`). Queries with `IN`, `RETURNING` or `ON CONFLICT` return rows in any order, so map them back to the input explicitly (see `SQLCRUDBase.read_by_ids`).
- `read_by_ids`-style methods raise `NoSuchElementError` for missing ids and repeat duplicate ids in the result. `update_multi` rejects duplicate ids with `DuplicateIdsError` (`common/common_exceptions.py`, HTTP 400); `delete_multi` ignores duplicate and missing ids and returns the number of deleted rows.
- `delete_multi` returns a count, not the deleted objects. Callers that need them (e.g. for websocket events) read them with `read_by_ids` before deleting.
- **Bulk updates**: `update_multi` takes two parallel lists, `ids` and `update_dtos` (the plain `<Entity>Update`). API bulk endpoints take one list of `<Entity>UpdateBulk` items that carry their `<entity>_id`; the service (or the endpoint, when the module has no service) splits them into the two lists.

### Errors

- Missing rows raise `NoSuchElementError(self.model, <field>=<value>, ...)`, from `repos/db/sql_exceptions.py`, a subclass of `NotFoundError` (`common/common_exceptions.py`, mapped to HTTP 404; subclasses need no own `@exception_handler`). `read`, `read_by_ids` and `exists(raise_error=True)` already do this. Lookups that may legitimately miss return `<Entity>ORM | None` instead.
- Invalid arguments raise `ValueError`; an intentionally unsupported base method raises `NotImplementedError`.
- Every exception class lives in `<module>_exceptions.py`, never in the CRUD file, including `NotFoundError` subclasses. Decorate it with `@exception_handler(status.HTTP_...)` unless it subclasses `NotFoundError`. E.g. `InvalidSearchViewOrderError` in `modules/search_view/search_view_exceptions.py`, `SourceDocumentPreprocessingUnfinishedError` in `core/doc/source_document_exceptions.py`.

### Dependencies

- A CRUD may call other `crud_*` singletons (e.g. `crud_span_anno` uses `crud_adoc`, `crud_span_text`). To break circular imports, import the other singleton inside the method (`from core.doc.source_document_crud import crud_sdoc`).
- SQL CRUDs touch only the SQL database: they import no other repo (only `repos.db.*`), no Weaviate/Elasticsearch/Redis client and no embedding CRUD, elastic CRUD or service. A side effect on another store (files, Weaviate, Elasticsearch) belongs in a service, e.g. `SourceDocumentService.delete_multi` and `FolderService.delete_folder`, which delete documents from all stores. `check_crud.py` enforces this (`sql-only`).
- No business logic, authentication or permission checks. Those belong in services (e.g. user authentication lives in `core/auth/auth_service.py`, not in `crud_user`).

## Variations

- **Composite primary key** (`document_aspect_crud`, `document_cluster_crud`, `word_frequency_crud`, `source_document_job_status_crud`): pass the key type as the fourth generic parameter, in key column order: `SQLCRUDBase[DocumentAspectORM, DocumentAspectCreate, DocumentAspectUpdate, tuple[int, int]]` for `(sdoc_id, aspect_id)`. The base builds every id filter from the model's primary key (`tuple_(...).in_(ids)`), so `read`, `read_by_ids`, `update_multi`, `delete_multi` and `exists` take these tuples and need no override. The parameter defaults to `int` (a single `id` column).

## Examples

See:

- [code_crud.py](backend/src/core/code/code_crud.py) — sections, custom reads, `update_with_children` reusing the base `update`.
- [span_annotation_crud.py](backend/src/core/annotation/span_annotation_crud.py) — `_multi` overrides that batch side effects (span texts, adoc timestamps) and call `super()`.
- [tag_crud.py](backend/src/core/tag/tag_crud.py) — batched reads, upsert link insert, batched delete with `rowcount`.
- [document_aspect_crud.py](backend/src/modules/perspectives/document_aspect_crud.py) — composite-key variation with batched, order-preserving `read_by_ids`.
