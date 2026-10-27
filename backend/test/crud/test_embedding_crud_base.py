"""Contract of EmbeddingCRUDBase: stored Weaviate properties and object UUIDs."""

import uuid

import pytest

from config import conf
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.project.project_orm import ProjectORM
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.aspect_embedding_dto import AspectObjectIdentifier
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import ObjectIdentifier
from repos.vector.weaviate_repo import WeaviateRepo

EMBEDDING_DIM = 4

# One object of every embedding CRUD, with the properties Weaviate must store
# (exactly the collection's properties) and the string its UUIDv5 is built from
EMBEDDING_CRUD_CASES = [
    # Sentence: two ids, the core case of text preprocessing
    pytest.param(
        crud_sentence_embedding,
        SentenceObjectIdentifier(sdoc_id=1, sentence_id=2),
        {"sdoc_id": 1, "sentence_id": 2},
        "sdoc_1_sentence_2",
        id="sentence",
    ),
    # Document: one id per text document
    pytest.param(
        crud_document_embedding,
        DocumentObjectIdentifier(sdoc_id=1),
        {"sdoc_id": 1},
        "sdoc_1",
        id="document",
    ),
    # Image: same name as document, but a different collection
    pytest.param(
        crud_image_embedding,
        ImageObjectIdentifier(sdoc_id=1),
        {"sdoc_id": 1},
        "sdoc_1",
        id="image",
    ),
    # Aspect (perspectives): one document of one aspect
    pytest.param(
        crud_aspect_embedding,
        AspectObjectIdentifier(aspect_id=3, sdoc_id=1),
        {"aspect_id": 3, "sdoc_id": 1},
        "aspect_3_sdoc_1",
        id="aspect",
    ),
    # Cluster (perspectives): one cluster of one aspect
    pytest.param(
        crud_cluster_embedding,
        ClusterObjectIdentifier(aspect_id=3, cluster_id=4),
        {"aspect_id": 3, "cluster_id": 4},
        "aspect_3_cluster_4",
        id="cluster",
    ),
]


def _stored_properties(
    crud: EmbeddingCRUDBase, project_id: int, id: ObjectIdentifier
) -> dict:
    """Read the properties Weaviate stored for the object with this identifier."""
    collection = crud._get_collection(
        client=WeaviateRepo().get_client(), project_id=project_id
    )
    obj = collection.query.fetch_object_by_id(id.uuidv5())
    assert obj is not None, f"object {id} was not stored"
    return dict(obj.properties)


# ===========================================================================
# OBJECT IDENTIFIER
# ===========================================================================


@pytest.mark.parametrize("crud,id,properties,name", EMBEDDING_CRUD_CASES)
def test_object_identifier_dumps_only_the_collection_properties(
    crud: EmbeddingCRUDBase,
    id: ObjectIdentifier,
    properties: dict,
    name: str,
) -> None:
    """The dump is stored as the Weaviate properties, so it must hold exactly
    the collection's properties (no UUID_NAMESPACE)."""
    assert id.model_dump() == properties
    assert set(properties) == set(crud.collection_class.properties)


@pytest.mark.parametrize("crud,id,properties,name", EMBEDDING_CRUD_CASES)
def test_object_identifier_uuidv5_is_built_from_namespace_and_name(
    crud: EmbeddingCRUDBase,
    id: ObjectIdentifier,
    properties: dict,
    name: str,
) -> None:
    """Existing Weaviate objects are addressed by this UUID, so its formula
    (UUIDv5 of the configured namespace and the identifier string) must never change."""
    expected = uuid.uuid5(uuid.UUID(conf.api.uuid_namespace), name)
    assert id.uuidv5() == str(expected)


# ===========================================================================
# CREATE
# ===========================================================================


@pytest.mark.parametrize("crud,id,properties,name", EMBEDDING_CRUD_CASES)
def test_create_stores_exactly_the_identifier_properties(
    test_project: ProjectORM,
    crud: EmbeddingCRUDBase,
    id: ObjectIdentifier,
    properties: dict,
    name: str,
) -> None:
    """`create` inserts the object under its UUIDv5 with the identifier fields as properties."""
    crud.create(
        WeaviateRepo().get_client(),
        project_id=test_project.id,
        id=id,
        embedding=[0.1] * EMBEDDING_DIM,
    )

    assert _stored_properties(crud, test_project.id, id) == properties


@pytest.mark.parametrize("crud,id,properties,name", EMBEDDING_CRUD_CASES)
def test_create_multi_stores_exactly_the_identifier_properties(
    test_project: ProjectORM,
    crud: EmbeddingCRUDBase,
    id: ObjectIdentifier,
    properties: dict,
    name: str,
) -> None:
    """`create_multi` (batch import) inserts the object under its UUIDv5 with the
    identifier fields as properties; a rejected property would raise WeaviateBatchImportError."""
    uuids = crud.create_multi(
        WeaviateRepo().get_client(),
        project_id=test_project.id,
        ids=[id],
        embeddings=[[0.1] * EMBEDDING_DIM],
    )

    assert [str(u) for u in uuids] == [id.uuidv5()]
    assert _stored_properties(crud, test_project.id, id) == properties
