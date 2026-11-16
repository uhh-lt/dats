"""The artefact `image_embeddings`, with the archive of its Weaviate collection."""

from collections.abc import Mapping

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from modules.simsearch.image_embedding_crud import crud_image_embedding
from modules.simsearch.image_embedding_dto import ImageObjectIdentifier
from repos.vector.weaviate_exceptions import WeaviateObjectIDNotFoundException
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact
from systems.artefact_system.artefact_system_enum import StorageKind

_EMBEDDING = TypeAdapter(list[float])


class _ImageEmbeddingArchive(ArtefactArchive):
    """The `image_embedding` column, from the Image collection of Weaviate."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        client = WeaviateRepo().get_client()
        if not crud_image_embedding._tenant_exists(
            client=client, project_id=sdoc.project_id
        ):
            return {}
        try:
            embedding = crud_image_embedding.read(
                client=client,
                project_id=sdoc.project_id,
                id=ImageObjectIdentifier(sdoc_id=sdoc.id),
            )
        except WeaviateObjectIDNotFoundException:
            return {}
        return {"image_embedding": embedding}

    def is_complete(self, archived: Mapping[str, object]) -> bool:
        return archived.get("image_embedding") is not None

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        crud_image_embedding.create(
            client=WeaviateRepo().get_client(),
            project_id=sdoc.project_id,
            id=ImageObjectIdentifier(sdoc_id=sdoc.id),
            embedding=_EMBEDDING.validate_python(archived["image_embedding"]),
        )


IMAGE_EMBEDDINGS = artefact(
    "image_embeddings", kind=StorageKind.OWN_STORE, archive=_ImageEmbeddingArchive()
)
