from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field

from app.core.data.doc_type import DocType
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead
from app.core.data.dto.util import PaginatedResults

SDOC_FILENAME_MAX_LENGTH = 200
SDOC_SUFFIX_MAX_LENGTH = 30


class SDocStatus(str, Enum):
    undefined_or_erroneous = "undefined_or_erroneous"  # "undefined_or_erroneous"

    import_text_document = "import_text_document"  # "imported uploaded text document"
    import_image_document = (
        "import_image_document"  # "imported uploaded image document"
    )
    import_audio_document = (
        "import_audio_document"  # "imported uploaded audio document"
    )
    import_video_document = (
        "import_video_document"  # "imported uploaded video document"
    )

    convert_to_webp_and_generate_thumbnails = "convert_to_webp_and_generate_thumbnails"  # "converted imported image to .webp and created a thumbnail"

    convert_mediafile_to_uncompressed_audio = "convert_mediafile_to_uncompressed_audio"  # "converts mediafile to uncompressed audio"
    create_sdoc_links_from_audio = "create_sdoc_links_from_audio"  # "extracted sdoc links from audio and stored in the db"
    generate_word_level_transcriptions = (
        "generate_word_level_transcriptions"  # "generate word level transcriptions"
    )
    generate_webp_thumbnails_from_audio = (
        "generate_webp_thumbnails_from_audio"  # "generate webp thumbnail from audio"
    )
    create_transcript_file = "create_transcript_file"  # "create transcript file"
    create_pptd_from_ppad = "create_pptd_from_ppad"  # "created pptds from ppads
    create_sdoc_links_from_text = "create_sdoc_links_from_text"  # "extracted sdoc links from text and stored in the db"

    generate_webp_thumbnails_from_video = (
        "generate_webp_thumbnails_from_video"  # "generate webp thumbnail from video"
    )
    create_ppad_from_ppvd = "create_ppad_from_ppvd"  # "created ppads from ppvds

    clean_html = "clean_html"  # "cleaned html of text document"
    extract_text_from_html_and_create_source_mapping = "extract_text_from_html_and_create_source_mapping"  # "created html2text source mapping "

    detect_language = "detect_language"  # "detect language of text document "
    generate_image_captions = (
        "generate_image_captions"  # "generated automatic image captions"
    )
    create_pptd_from_caption = (
        "create_pptd_from_caption"  # "created pptds from automatic caption"
    )
    generate_span_annotations = (
        "generate_span_annotations"  # "generated span annotations"
    )
    generate_bbox_annotations = (
        "generate_bbox_annotations"  # "generated automatic bbox annotations"
    )

    add_custom_html_tags = (
        "add_custom_html_tags"  # "added custom html tags for sentences and tokens"
    )
    create_sdoc_links_from_html = "create_sdoc_links_from_html"  # "extracted sdoc links from html and stored in the db"

    store_metadata_in_db = "store_metadata_in_db"  # "persisted metadata in db"
    store_span_annotations_in_db = (
        "store_span_annotations_in_db"  # "persisted automatic span annotations"
    )
    store_bbox_annotations_in_db = (
        "store_bbox_annotations_in_db"  # "persisted automatic bbox annotations"
    )
    store_document_in_elasticsearch = (
        "store_document_in_elasticsearch"  # "added document to elasticsearch index"
    )
    index_image_document_in_faiss = (
        "index_image_document_in_faiss"  # "added document to faiss index"
    )
    index_text_document_in_faiss = (
        "index_text_document_in_faiss"  # "added document to faiss index"
    )

    finished = "finished"  # "added document to faiss index"


"""
 TODO Flo:
 Because we"re not storing the content in the SQL DB but only in the ES instance we handle this differently
  than in other DTOs.
"""


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(
        description="Filename of the SourceDocument",
        max_length=SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH,
    )
    content: str = Field(description="Content of the SourceDocument")
    doctype: DocType = Field(description="DOCTYPE of the SourceDocument")
    status: SDocStatus = Field(description="Status of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")


# Properties for creation
# Flo: Since we"re uploading a file we have to use multipart/form-data directily in the router method
class SourceDocumentCreate(SourceDocumentBaseDTO):
    pass


# Properties for updating
# Flo: We do not want to update SourceDocuments
# class SourceDocumentUpdate(SourceDocumentBaseDTO):
#     pass


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    created: datetime = Field(description="The created timestamp of the SourceDocument")
    updated: datetime = Field(description="Updated timestamp of the Memo")

    class Config:
        orm_mode = True


class SourceDocumentReadAction(SourceDocumentRead):
    tags: List[DocumentTagRead] = Field(description="Tags of the SourceDocument")
    metadata: List[SourceDocumentMetadataRead] = Field(
        description="Metadata of the SourceDocument"
    )


class PaginatedSourceDocumentReads(PaginatedResults):
    sdocs: List[SourceDocumentRead] = Field(
        description="The SourceDocuments on this page"
    )


class SourceDocumentContent(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the content belongs to."
    )
    content: str = Field(
        description="The (textual) content of the SourceDocument the content belongs to."
    )


class SourceDocumentHTML(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the content belongs to."
    )
    html: str = Field(description="The (html) content of the SourceDocument.")


class SourceDocumentTokens(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Tokens belong to."
    )
    tokens: List[str] = Field(
        description="The (textual) list Tokens of the SourceDocument the Tokens belong to."
    )
    token_character_offsets: Optional[List[Tuple[int, int]]] = Field(
        description=("The list of character offsets of" " the Tokens"),
        default=None,
    )


class SourceDocumentSentences(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Sentences belong to."
    )
    sentences: List[str] = Field(
        description="The Sentences of the SourceDocument the Sentences belong to."
    )
    sentence_character_offsets: Optional[List[Tuple[int, int]]] = Field(
        description=("The list of character offsets of" " the Sentences"),
        default=None,
    )


class SourceDocumentKeywords(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Keywords belong to."
    )
    keywords: List[str] = Field(
        description="The list of Keywords of the SourceDocument the Keywords belong to."
    )
