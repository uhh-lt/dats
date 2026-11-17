"""The artefact `sentence_embeddings`, computed on demand and read by several
features, with the archive of its Weaviate collection."""

from collections.abc import Mapping

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from core.artefacts.sentence_embeddings.sentence_embedding_crud import (
    crud_sentence_embedding,
)
from core.artefacts.sentence_embeddings.sentence_embedding_dto import (
    SentenceObjectIdentifier,
)
from core.doc.source_document_orm import SourceDocumentORM
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact

_EMBEDDINGS = TypeAdapter(list[list[float]])
_STARTS = TypeAdapter(list[int])


class _SentenceEmbeddingArchive(ArtefactArchive):
    """The `sentence_embeddings` column, by sentence id, from the Sentence
    collection of Weaviate."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        client = WeaviateRepo().get_client()
        if not crud_sentence_embedding._tenant_exists(
            client=client, project_id=sdoc.project_id
        ):
            return {}
        # Weaviate returns the objects unordered; the import assigns the sentence
        # ids by position
        embeddings = sorted(
            crud_sentence_embedding.read_by_sdoc_id(
                client=client, project_id=sdoc.project_id, sdoc_id=sdoc.id
            ),
            key=lambda se: se.id.sentence_id,
        )
        return {"sentence_embeddings": [se.embedding for se in embeddings]}

    def is_complete(self, archived: Mapping[str, object]) -> bool:
        # one embedding per sentence: archives of older versions hold at most 25
        embeddings = _EMBEDDINGS.validate_python(archived["sentence_embeddings"])
        starts = _STARTS.validate_python(archived["sentence_starts"])
        return len(embeddings) == len(starts)

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        embeddings = _EMBEDDINGS.validate_python(archived["sentence_embeddings"])
        crud_sentence_embedding.create_multi(
            client=WeaviateRepo().get_client(),
            project_id=sdoc.project_id,
            ids=[
                SentenceObjectIdentifier(sdoc_id=sdoc.id, sentence_id=i)
                for i in range(len(embeddings))
            ],
            embeddings=embeddings,
        )


SENTENCE_EMBEDDINGS = artefact(
    "sentence_embeddings",
    title="Sentence embeddings",
    archive=_SentenceEmbeddingArchive(),
)
