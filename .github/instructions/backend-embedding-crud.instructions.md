---
applyTo: "backend/src/**/*_embedding_crud.py"
paths:
  - "backend/src/**/*_embedding_crud.py"
---

# Backend Embedding CRUD Pattern

Embedding CRUD modules are the data-access layer for one Weaviate vector collection. Each file defines one `CRUD<X>Embedding` class on the generic base `EmbeddingCRUDBase` ([embedding_crud_base.py](backend/src/repos/vector/embedding_crud_base.py)) and exports one module-level singleton. Objects are addressed by a typed `<X>ObjectIdentifier` (whose `uuidv5()` is the Weaviate UUID) and stored per project in a tenant (`Project<id>`), so every method takes the client and the project id. Keeping them uniform keeps tenant handling, cleanup on deletion and similarity search identical for every collection.

## File Structure

```python
# 1. Imports: weaviate client + Filter, own collection, own object identifier, the base,
#    weaviate_models result types
from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from core.doc.document_collection import DocumentCollection
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import SimSearchResult


# 2. The CRUD class, generic over [<X>ObjectIdentifier, <X>Collection], with a one-line docstring
class CRUDDocumentEmbedding(EmbeddingCRUDBase[DocumentObjectIdentifier, DocumentCollection]):
    """
    CRUD operations for document embeddings in Weaviate
    """

    ### READ OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### DELETE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### OTHER OPERATIONS ###
    def search_near_sdoc(
        self, client: WeaviateClient, *, project_id: int, sdoc_id: int, k: int, threshold: float
    ) -> list[SimSearchResult[DocumentObjectIdentifier]]: ...


# 3. The singleton, built with keyword arguments
crud_document_embedding = CRUDDocumentEmbedding(
    collection_class=DocumentCollection,
    object_identifier=DocumentObjectIdentifier,
)

```

## Rules

### Naming and Structure

- **File and class**: `<x>_embedding_crud.py` defines exactly one `CRUD<X>Embedding(EmbeddingCRUDBase[<X>ObjectIdentifier, <X>Collection])`.
- **Docstring**: the class has the one-line docstring `CRUD operations for <x> embeddings in Weaviate`.
- **Singleton**: `crud_<x>_embedding = CRUD<X>Embedding(collection_class=<X>Collection, object_identifier=<X>ObjectIdentifier)` below the class. Callers import the singleton, never the class.
- **Companions**: the generic parameters come from `<x>_collection.py` (a `BaseCollection` with `name`, `description` and a `TypedDict` of `properties`) and `<x>_embedding_dto.py` (the `ObjectIdentifier`). Its fields must match the collection's properties, because the base stores `id.model_dump()` as the object's properties.
- **Sections**: group methods under `### CREATE OPERATIONS ###`, `### READ OPERATIONS ###`, `### UPDATE OPERATIONS ###`, `### DELETE OPERATIONS ###`, `### OTHER OPERATIONS ###`, in that order (`exists_*` and `search_*` go under OTHER). Omit empty sections, or keep the header with a `# Inherited from <Base>` comment.
- **Lint**: `backend/lint/check_crud.py` enforces these conventions. It runs in `just lint backend` and in the `Lint: Backend CRUD conventions` pre-commit hook (so also in CI).

### Verbs and Signatures

- **Base methods**: `create`, `create_multi`, `read`, `read_by_ids`, `read_by_filters`, `delete`, `delete_by_project`, `search_near_object`, `search_near_vector`. Do not override or reimplement them. (This is specific to Embedding CRUDs; SQL CRUDs override their base instead.)
- **Subclass names**: use the same verbs with `_by_<field>` for lookups (`read_by_sdoc_id`, `read_by_aspect_id`, `delete_by_aspect_id`) and `search_near_<x>` for searches. `get_` and `find_` are forbidden, and so are `add_`/`remove_` (SQL-only verbs): use `create`/`delete`.
- **Private helpers** (`_name`) are exempt from the verb, order and section rules, but still need a return annotation.
- **Client first**: the first parameter after `self` is `client: WeaviateClient`; every parameter after it is keyword-only (`*`) and the project id is `project_id`. The SQL session plays no role here.
- Every method has a return annotation; docstrings use the `Args:` / `Returns:` style.
- **Keyword calls**: call base methods with keyword arguments (`client=client, project_id=project_id, ...`).
- **Return base result types**: searches return `list[SimSearchResult[<X>ObjectIdentifier]]`, filter reads return `list[EmbeddingSearchResult[<X>ObjectIdentifier]]` (from `repos.vector.weaviate_models`). Never build other DTOs here; that belongs in services.

### Weaviate Access

- **Filters by property**: build filters with `Filter.by_property(self.collection_class.properties["<field>"].name)`, never with a hard-coded property string. Use `.equal(value)` for one id and `.contains_any(ids)` for an optional id list (pass `filters=None` when the list is empty or `None`).
- **Collection access**: use `self._get_collection(client=..., project_id=...)`; never call `client.collections.get(...)` directly.
- **Bulk deletes check the tenant**: wrap every `collection.data.delete_many(...)` in `if self._tenant_exists(client=client, project_id=project_id):`, so cleanup does not fail for projects without data.
- **Errors**: missing objects raise `WeaviateObjectIDNotFoundException` / `WeaviateObjectIDsNotFoundException` / `WeaviateObjectUUIDNotFoundException` (`repos/vector/weaviate_exceptions.py`), all subclasses of `NotFoundError` (`common/common_exceptions.py`, mapped to HTTP 404; subclasses need no own `@exception_handler`).

### Cleanup

- **Delete with the source document**: CRUDs need no cleanup code for deleted source documents. `SourceDocumentService.delete_multi` calls `BaseCollection.delete_by_sdoc_ids` for every collection whose properties contain `sdoc_id`. Do not add event listeners or a per-CRUD `delete_by_sdoc_id`.
- **Project lifecycle**: `BaseCollection.all_collections()` imports every `*_collection.py`, so a new collection is created (`bootstrap.py`), gets its tenants (`ProjectService.create_project`) and is cleaned up (`ProjectService.delete_project`, `SourceDocumentService`) without registration.
- No business logic, embedding computation or Ray calls. Those belong in services (`embedding_service.py`, `simsearch_service.py`).

## Examples

See:

- [document_embedding_crud.py](backend/src/core/doc/document_embedding_crud.py) — minimal module: a filtered search wrapper and inherited create, read and delete.
- [aspect_embedding_crud.py](backend/src/modules/perspectives/aspect_embedding_crud.py) — two `delete_by_*` methods and a search scoped to another entity (`search_near_vector_in_aspect`).
