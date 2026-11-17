"""The artefact `document_embeddings`, with the archive of its Weaviate collection."""

from collections.abc import Mapping

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from modules.tag_recommendation.document_embedding_crud import crud_document_embedding
from modules.tag_recommendation.document_embedding_dto import DocumentObjectIdentifier
from repos.vector.weaviate_exceptions import WeaviateObjectIDNotFoundException
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact

_EMBEDDING = TypeAdapter(list[float])


class _DocumentEmbeddingArchive(ArtefactArchive):
    """The `document_embedding` column, from the Document collection of Weaviate."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        client = WeaviateRepo().get_client()
        if not crud_document_embedding._tenant_exists(
            client=client, project_id=sdoc.project_id
        ):
            return {}
        try:
            embedding = crud_document_embedding.read(
                client=client,
                project_id=sdoc.project_id,
                id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
            )
        except WeaviateObjectIDNotFoundException:
            return {}
        return {"document_embedding": embedding}

    def is_complete(self, archived: Mapping[str, object]) -> bool:
        return archived.get("document_embedding") is not None

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        crud_document_embedding.create(
            client=WeaviateRepo().get_client(),
            project_id=sdoc.project_id,
            id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
            embedding=_EMBEDDING.validate_python(archived["document_embedding"]),
        )


DOCUMENT_EMBEDDINGS = artefact(
    "document_embeddings",
    archive=_DocumentEmbeddingArchive(),
)
