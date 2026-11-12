"""How each artefact of a source document travels in a project export: one entry
per `Artefact` in `ARTEFACT_ARCHIVE`.

An entry is either an archive module, which reads the artefact's data of a
document from its store, says whether archived data is complete and writes it
back on import, or the parts of the archive that carry the artefact. The export
and the import iterate over the archive modules; the parts need nothing of their
own. A new artefact needs its entry (`test_artefact_archive.py` fails otherwise).
"""

from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from modules.doc_processing.image.image_thumbnail_generation_job import (
    generate_thumbnails,
)
from modules.doc_processing.video.video_audio_extraction_job import (
    extract_audio_stream,
)
from modules.doc_processing.video.video_thumbnail_generation_job import (
    store_video_thumbnail,
)
from modules.eximport.export_enum import ArchivePart
from modules.eximport.sdocs.sdoc_export_schema import SourceDocumentExportSchema
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_exceptions import WeaviateObjectIDNotFoundException
from repos.vector.weaviate_repo import WeaviateRepo


class ArchiveModule(ABC):
    """Carries one artefact with its own store through the archive. The export
    reads it and the import writes it only if the step producing it finished."""

    @abstractmethod
    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        """The archive columns of the document's artefact, read from its store."""

    def is_complete(self, archived: SourceDocumentExportSchema) -> bool:
        """Whether the archive holds the whole artefact, so its step can be
        imported as it was. Artefacts that are recomputed on import are."""
        return True

    @abstractmethod
    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        """Write the archived artefact of the imported document to its store."""


class _DocumentEmbeddingArchive(ArchiveModule):
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

    def is_complete(self, archived: SourceDocumentExportSchema) -> bool:
        return archived.document_embedding is not None

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        assert archived.document_embedding is not None
        crud_document_embedding.create(
            client=WeaviateRepo().get_client(),
            project_id=sdoc.project_id,
            id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
            embedding=archived.document_embedding,
        )


class _SentenceEmbeddingArchive(ArchiveModule):
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

    def is_complete(self, archived: SourceDocumentExportSchema) -> bool:
        # one embedding per sentence: archives of older versions hold at most 25
        return len(archived.sentence_embeddings) == len(archived.sentence_starts)

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        crud_sentence_embedding.create_multi(
            client=WeaviateRepo().get_client(),
            project_id=sdoc.project_id,
            ids=[
                SentenceObjectIdentifier(sdoc_id=sdoc.id, sentence_id=i)
                for i in range(len(archived.sentence_embeddings))
            ],
            embeddings=archived.sentence_embeddings,
        )


class _ImageEmbeddingArchive(ArchiveModule):
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

    def is_complete(self, archived: SourceDocumentExportSchema) -> bool:
        return archived.image_embedding is not None

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        assert archived.image_embedding is not None
        crud_image_embedding.create(
            client=WeaviateRepo().get_client(),
            project_id=sdoc.project_id,
            id=ImageObjectIdentifier(sdoc_id=sdoc.id),
            embedding=archived.image_embedding,
        )


class _WordFrequencyArchive(ArchiveModule):
    """The `word_frequencies` column, from the word frequency table."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {
            "word_frequencies": [(wf.word, wf.count) for wf in sdoc.word_frequencies]
        }

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        crud_word_frequency.create_multi(
            db=db,
            create_dtos=[
                WordFrequencyCreate(sdoc_id=sdoc.id, word=word, count=count)
                for word, count in archived.word_frequencies
            ],
        )


class _ElasticIndexArchive(ArchiveModule):
    """The Elasticsearch entry, computed again from the filename and the content."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        crud_sdoc_elastic.create(
            client=ElasticSearchRepo().get_client(),
            project_id=sdoc.project_id,
            create_dto=ElasticSearchDocumentCreate(
                project_id=sdoc.project_id,
                sdoc_id=sdoc.id,
                filename=sdoc.filename,
                content=archived.content or "",
            ),
        )


class _ThumbnailArchive(ArchiveModule):
    """The thumbnail files, written again from the uploaded file with the code of
    the thumbnail steps: the WebP and thumbnail of an image, the thumbnail of a
    video (linked as `repo_url`). The audio thumbnail step writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        sdoc_read = SourceDocumentRead.model_validate(sdoc)
        path = FilesystemRepo().get_path_to_sdoc_file(sdoc_read)
        match sdoc_read.doctype:
            case DocType.image:
                generate_thumbnails(path)
            case DocType.video:
                store_video_thumbnail(db=db, sdoc=sdoc_read, video_path=path)


class _AudioArchive(ArchiveModule):
    """The audio stream. Of a video, it is extracted again from the uploaded
    file with the code of video_audio_extraction; of an audio document, it is the
    uploaded file itself, which no step produces, so the import writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: SourceDocumentExportSchema
    ) -> None:
        extract_audio_stream(
            FilesystemRepo().get_path_to_sdoc_file(
                SourceDocumentRead.model_validate(sdoc)
            )
        )


# The parts of the archive that carry an artefact without an archive module
CarriedBy = tuple[ArchivePart, ...]

ARTEFACT_ARCHIVE: dict[Artefact, ArchiveModule | CarriedBy] = {
    # the columns of the document's data row
    Artefact.RAW_HTML: (ArchivePart.DATA_ROW,),
    Artefact.CONTENT: (ArchivePart.DATA_ROW,),
    Artefact.TOKENS_SENTENCES: (ArchivePart.DATA_ROW,),
    Artefact.HTML: (ArchivePart.DATA_ROW,),
    # content, raw HTML, tokens and token times
    Artefact.TRANSCRIPT: (ArchivePart.DATA_ROW,),
    # metadata keys
    Artefact.LANGUAGE: (ArchivePart.METADATA,),  # "language"
    Artefact.FILE_METADATA: (ArchivePart.METADATA,),  # e.g. "width", "height"
    Artefact.KEYWORDS: (ArchivePart.METADATA,),  # "keywords"
    # the metadata key "caption" and the raw HTML
    Artefact.IMAGE_CAPTION: (ArchivePart.METADATA, ArchivePart.DATA_ROW),
    # the span and bbox annotations of the system user
    Artefact.NER_SPANS: (ArchivePart.ANNOTATIONS,),
    Artefact.OBJECT_BBOXES: (ArchivePart.ANNOTATIONS,),
    # archive modules
    Artefact.DOCUMENT_EMBEDDINGS: _DocumentEmbeddingArchive(),
    Artefact.SENTENCE_EMBEDDINGS: _SentenceEmbeddingArchive(),
    Artefact.IMAGE_EMBEDDINGS: _ImageEmbeddingArchive(),
    Artefact.WORD_FREQUENCIES: _WordFrequencyArchive(),
    Artefact.ES_INDEX: _ElasticIndexArchive(),
    Artefact.THUMBNAIL: _ThumbnailArchive(),
    Artefact.AUDIO: _AudioArchive(),
}


def archive_modules() -> dict[Artefact, ArchiveModule]:
    """The artefacts with an archive module, with their module."""
    return {
        artefact: entry
        for artefact, entry in ARTEFACT_ARCHIVE.items()
        if isinstance(entry, ArchiveModule)
    }
