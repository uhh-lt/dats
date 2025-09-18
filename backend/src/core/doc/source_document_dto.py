from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from common.doc_type import DocType
from common.sdoc_status_enum import SDocStatus
from repos.db.dto_base import UpdateDTOBase

SDOC_FILENAME_MAX_LENGTH = 200
SDOC_SUFFIX_MAX_LENGTH = 30


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(
        description="Filename of the SourceDocument",
        max_length=SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH,
    )
    name: str = Field(
        description="User-defined name of the document (default is the filename)"
    )
    doctype: DocType = Field(description="DOCTYPE of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")


# Properties for updating
class SourceDocumentUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(
        description="User-defined name of the document (default is the filename)",
        default=None,
    )
    folder_id: int | None = Field(
        description="ID of the Folder this SourceDocument belongs to", default=None
    )

    # KEEP THE SAME ORDER AS source_document_orm.py!

    # text
    extract_html: SDocStatus | None = Field(
        description="Extract HTML done?", default=None
    )

    # HTML
    text_extraction: SDocStatus | None = Field(
        description="Text Extraction done?", default=None
    )
    text_language_detection: SDocStatus | None = Field(
        description="Text Language Detection done?", default=None
    )
    text_spacy: SDocStatus | None = Field(description="Text Spacy done?", default=None)
    text_es_index: SDocStatus | None = Field(
        description="Text ES Index done?", default=None
    )
    text_sentence_embedding: SDocStatus | None = Field(
        description="Text Sentence Embedding done?", default=None
    )
    text_html_mapping: SDocStatus | None = Field(
        description="Text HTML Mapping done?", default=None
    )

    # IMAGES
    image_caption: SDocStatus | None = Field(
        description="Image Captioning done?", default=None
    )
    image_embedding: SDocStatus | None = Field(
        description="Image Embedding done?", default=None
    )
    image_metadata_extraction: SDocStatus | None = Field(
        description="Image Metadata Extraction done?", default=None
    )
    image_thumbnail: SDocStatus | None = Field(
        description="Image Thumbnail Generation done?", default=None
    )
    image_object_detection: SDocStatus | None = Field(
        description="Object Detection done?", default=None
    )

    # AUDIO
    audio_metadata: SDocStatus | None = Field(
        description="Audio Metadata Extraction done?", default=None
    )
    audio_thumbnail: SDocStatus | None = Field(
        description="Audio Thumbnail Generation done?", default=None
    )
    audio_transcription: SDocStatus | None = Field(
        description="Transcription done?", default=None
    )

    # VIDEO
    video_metadata: SDocStatus | None = Field(
        description="Video Metadata Extraction done?", default=None
    )
    video_thumbnail: SDocStatus | None = Field(
        description="Video Thumbnail Generation done?", default=None
    )
    video_audio_extraction: SDocStatus | None = Field(
        description="Video Audio Extraction done?", default=None
    )


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    created: datetime = Field(description="The created timestamp of the SourceDocument")
    updated: datetime = Field(description="Updated timestamp of the SourceDocument")
    folder_id: int = Field(
        description="ID of the Folder this SourceDocument belongs to"
    )

    model_config = ConfigDict(from_attributes=True)


class SourceDocumentCreate(SourceDocumentBaseDTO):
    folder_id: int | None = Field(
        description="ID of the Folder this SourceDocument belongs to. If not provided, a folder with the filename of the SourceDocument will be created automatically.",
        default=None,
    )
