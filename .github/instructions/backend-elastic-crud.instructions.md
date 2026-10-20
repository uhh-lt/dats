---
applyTo: "backend/src/**/*_elastic_crud.py"
paths:
  - "backend/src/**/*_elastic_crud.py"
---

# Backend Elastic CRUD Pattern

Elastic CRUD modules are the data-access layer for one Elasticsearch index. Each file defines one `CRUD<X>Elastic` class on the generic base `ElasticCRUDBase` ([elastic_crud_base.py](backend/src/repos/elastic/elastic_crud_base.py)) and exports one module-level singleton. Every project has its own index (`<prefix>_project_<id>_<name>`), so every method takes the client and the project id. Today there is one module (`sdoc_elastic_crud.py`); every new module reuses the base the same way.

## File Structure

```python
# 1. Imports: Elasticsearch client, own ES DTOs, own index, the base, result DTOs, the event
from elasticsearch import Elasticsearch

from core.doc.sdoc_elastic_dto import (
    ElasticSearchDocument,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentUpdate,
)
from core.doc.sdoc_elastic_index import SdocIndex
from repos.elastic.elastic_crud_base import ElasticCRUDBase
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits
from systems.event_system.events import source_document_deleted


# 2. The CRUD class, generic over [Index, Model, CreateDTO, UpdateDTO]
class CRUDSdocElastic(
    ElasticCRUDBase[
        SdocIndex,
        ElasticSearchDocument,
        ElasticSearchDocumentCreate,
        ElasticSearchDocumentUpdate,
    ]
):
    ### UPDATE OPERATIONS ###
    # Inherited from ElasticCRUDBase

    ### OTHER OPERATIONS ###
    # Domain-specific searches: build the Query DSL, then delegate to self.search(...)
    def search_sdocs_by_content_query(
        self, client: Elasticsearch, *, project_id: int, sdoc_ids: set[int] | None, query: str, ...
    ) -> PaginatedElasticSearchHits:
        q = {"simple_query_string": {"query": query, "fields": ["content"]}}
        return self.search(client=client, project_id=project_id, query={"bool": {"must": [q]}}, ...)


# 3. The singleton, built with keyword arguments
crud_sdoc_elastic = CRUDSdocElastic(index=SdocIndex, model=ElasticSearchDocument)

# 4. Event handlers

# Handle events


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int) -> None:
    from repos.elastic.elastic_repo import ElasticSearchRepo

    crud_sdoc_elastic.delete(
        client=ElasticSearchRepo().get_client(), project_id=project_id, id=sdoc_id
    )
```

## Rules

### Naming and Structure

- **File, class, singleton**: `<x>_elastic_crud.py` defines exactly one `CRUD<X>Elastic(ElasticCRUDBase[<X>Index, <Model>, <Create>, <Update>])` and the singleton `crud_<x>_elastic = CRUD<X>Elastic(index=<X>Index, model=<Model>)` below it. This mirrors `<x>_embedding_crud.py` → `CRUD<X>Embedding` → `crud_<x>_embedding`. Callers import the singleton, never the class.
- **Companions**: the generic parameters come from `<x>_elastic_index.py` (an `IndexBase` with `name`, `description`, `mappings` and `settings`) and `<x>_elastic_dto.py` (`<Model>` and `<Create>` extend `ElasticSearchModelBase` and implement `get_id()`; `<Update>` holds only updatable fields). Field names in the DTOs must match the index `mappings`.
- **Sections**: group methods under `### CREATE OPERATIONS ###`, `### READ OPERATIONS ###`, `### UPDATE OPERATIONS ###`, `### DELETE OPERATIONS ###`, `### OTHER OPERATIONS ###`, in that order (`exists_*` and `search_*` go under OTHER). Omit empty sections, or keep the header with a `# Inherited from <Base>` comment.
- **Lint**: `backend/lint/check_crud.py` enforces these conventions. It runs in `just lint backend` and in the `Lint: Backend CRUD conventions` pre-commit hook (so also in CI).

### Verbs and Signatures

- **Base methods**: `create`, `read`, `update`, `delete`, `search`. Do not override them.
- **Subclass names**: use the same verbs with `_by_<field>` for lookups and `search_<what>` for searches. `get_` and `find_` are forbidden, and so are `add_`/`remove_` (SQL-only verbs): use `create`/`delete`.
- **Private helpers** (`_name`) are exempt from the verb, order and section rules, but still need a return annotation.
- **Client first**: the first parameter after `self` is `client: Elasticsearch`; every parameter after it is keyword-only (`*`) and the project id is `project_id`, never `proj_id`. Never a `db: Session`.
- Every method has a return annotation; docstrings use the `Args:` / `Returns:` style.
- **Results**: searches return `PaginatedElasticSearchHits` (ids, scores, highlights, `total_results`); `read`/`update` return the model DTO. Never return raw Elasticsearch response dicts or Read DTOs.

### Queries

- **Delegate to `self.search`**: custom search methods only build the Query DSL dict (and an optional `highlight` dict) and call `self.search(client=client, project_id=..., query=..., limit=..., skip=..., highlight=...)`. Never call `client.search` / `helpers.scan` directly; the base enforces the index check, the 10 000 limit/skip bounds and the scroll fallback when `limit` or `skip` is `None`.
- **Filtering by ids**: restrict to a caller-supplied id set with a `terms` clause inside `bool.must`, capped at 65 536 terms (`list(ids)[:65536]`). `None` means no filter.
- **Index names**: always resolve them with `self.index.get_index_name(project_id=project_id)`; never build index name strings.

### Errors

- Missing documents raise the base's `NoSuchObjectInElasticSearchError`, a subclass of `NotFoundError` (`common/exception_handler.py`, mapped to HTTP 404; subclasses need no own `@exception_handler`). Invalid query arguments raise `ValueError`.

### Cleanup

- **Delete with the source document**: the file ends with a `# Handle events` block that connects `@source_document_deleted.connect` to `handle_source_document_deleted(sender, sdoc_id: int, project_id: int)`, imports `ElasticSearchRepo` inside the function and calls the CRUD's `delete`.
- **Project lifecycle**: a new index must be created in `ProjectService.create_project` (`crud_<x>_elastic.index.create_index(client=..., project_id=...)`) and removed in `ProjectService.delete_project` (`.index.delete_index(...)`).
- No business logic or result enrichment (joining SQL data, building Read DTOs). That belongs in the search services (`modules/search/sdoc_search/sdoc_search.py`).

## Examples

See:

- [sdoc_elastic_crud.py](backend/src/core/doc/sdoc_elastic_crud.py) — the reference module: content search building a `bool` query with an optional `terms` filter, singleton and event handler.
