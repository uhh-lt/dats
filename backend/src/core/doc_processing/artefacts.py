"""The artefacts of the standard pipeline: the eleven that every document gets
(the search index among them) and the on-demand artefacts that several
features share (the word frequencies, the sentence embeddings), with the
archives of their own stores."""

from collections.abc import Mapping

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.word_frequency_crud import crud_word_frequency
from core.doc.word_frequency_dto import WordFrequencyCreate
from core.doc_processing.image.image_thumbnail_utils import generate_thumbnails
from core.doc_processing.video.video_utils import (
    extract_audio_stream,
    store_video_thumbnail,
)
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact
from systems.artefact_system.artefact_system_enum import StorageKind

_EMBEDDINGS = TypeAdapter(list[list[float]])
_STARTS = TypeAdapter(list[int])
_WORD_FREQUENCIES = TypeAdapter(list[tuple[str, int]])
_CONTENT = TypeAdapter(str | None)


class _ThumbnailArchive(ArtefactArchive):
    """The thumbnail files, written again from the uploaded file with the code of
    the thumbnail steps: the WebP and thumbnail of an image, the thumbnail of a
    video (linked as `repo_url`). The audio thumbnail step writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        sdoc_read = SourceDocumentRead.model_validate(sdoc)
        path = FilesystemRepo().get_path_to_sdoc_file(sdoc_read)
        match sdoc_read.doctype:
            case DocType.image:
                generate_thumbnails(path)
            case DocType.video:
                store_video_thumbnail(db=db, sdoc=sdoc_read, video_path=path)


class _AudioArchive(ArtefactArchive):
    """The audio stream. Of a video, it is extracted again from the uploaded
    file with the code of video_audio_extraction; of an audio document, it is the
    uploaded file itself, which no step produces, so the import writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        extract_audio_stream(
            FilesystemRepo().get_path_to_sdoc_file(
                SourceDocumentRead.model_validate(sdoc)
            )
        )


class _ElasticIndexArchive(ArtefactArchive):
    """The Elasticsearch entry, computed again from the filename and the content."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        crud_sdoc_elastic.create(
            client=ElasticSearchRepo().get_client(),
            project_id=sdoc.project_id,
            create_dto=ElasticSearchDocumentCreate(
                project_id=sdoc.project_id,
                sdoc_id=sdoc.id,
                filename=sdoc.filename,
                content=_CONTENT.validate_python(archived.get("content")) or "",
            ),
        )


class _WordFrequencyArchive(ArtefactArchive):
    """The `word_frequencies` column, from the word frequency table."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {
            "word_frequencies": [(wf.word, wf.count) for wf in sdoc.word_frequencies]
        }

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        crud_word_frequency.create_multi(
            db=db,
            create_dtos=[
                WordFrequencyCreate(sdoc_id=sdoc.id, word=word, count=count)
                for word, count in _WORD_FREQUENCIES.validate_python(
                    archived["word_frequencies"]
                )
            ],
        )


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


# --- always computed: every document gets them

# carried by the columns of the document's data row
RAW_HTML = artefact("raw_html", kind=StorageKind.DOCUMENT_DATA, always=True)
CONTENT = artefact("content", kind=StorageKind.DOCUMENT_DATA, always=True)
TOKENS_SENTENCES = artefact(
    "tokens_sentences", kind=StorageKind.DOCUMENT_DATA, always=True
)
HTML = artefact("html", kind=StorageKind.DOCUMENT_DATA, always=True)
# content, raw HTML, tokens and token times
TRANSCRIPT = artefact("transcript", kind=StorageKind.DOCUMENT_DATA, always=True)
# carried by the metadata keys "language", the file metadata and "caption"
LANGUAGE = artefact("language", kind=StorageKind.METADATA, always=True)
FILE_METADATA = artefact("file_metadata", kind=StorageKind.METADATA, always=True)
IMAGE_CAPTION = artefact("image_caption", kind=StorageKind.METADATA, always=True)
THUMBNAIL = artefact(
    "thumbnail", kind=StorageKind.OWN_STORE, always=True, archive=_ThumbnailArchive()
)
# the audio stream: the uploaded file of an audio document, extracted from a video
AUDIO = artefact(
    "audio",
    kind=StorageKind.OWN_STORE,
    always=True,
    uploaded_for={DocType.audio},
    archive=_AudioArchive(),
)
# the full-text search index: search is core
ES_INDEX = artefact(
    "es_index", kind=StorageKind.OWN_STORE, always=True, archive=_ElasticIndexArchive()
)

# --- computed on demand, shared by several features

WORD_FREQUENCIES = artefact(
    "word_frequencies", kind=StorageKind.OWN_STORE, archive=_WordFrequencyArchive()
)
SENTENCE_EMBEDDINGS = artefact(
    "sentence_embeddings",
    kind=StorageKind.OWN_STORE,
    archive=_SentenceEmbeddingArchive(),
)
