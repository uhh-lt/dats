from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase


class SourceDocumenStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")


class SourceDocumentStatusRead(SourceDocumenStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentStatusCreate(SourceDocumenStatusBaseDTO):
    pass


class SourceDocumentStatusUpdate(BaseModel, UpdateDTOBase):
    # KEEP THE SAME ORDER AS source_document_status_orm.py!

    # init
    sdoc_init: bool | None = Field(description="SDoc Init done?", default=None)
    extract_archive: bool | None = Field(
        description="Extract Archive done?", default=None
    )
    pdf_checking: bool | None = Field(description="PDF Checking done?", default=None)
    extract_html: bool | None = Field(description="Extract HTML done?", default=None)

    # HTML
    text_extraction: bool | None = Field(
        description="Text Extraction done?", default=None
    )
    text_language_detection: bool | None = Field(
        description="Text Language Detection done?", default=None
    )
    text_spacy: bool | None = Field(description="Text Spacy done?", default=None)
    text_es_index: bool | None = Field(description="Text ES Index done?", default=None)
    text_sentence_embedding: bool | None = Field(
        description="Text Sentence Embedding done?", default=None
    )
    text_html_mapping: bool | None = Field(
        description="Text HTML Mapping done?", default=None
    )

    # IMAGES
    image_caption: bool | None = Field(
        description="Image Captioning done?", default=None
    )
    image_embedding: bool | None = Field(
        description="Image Embedding done?", default=None
    )
    image_metadata_extraction: bool | None = Field(
        description="Image Metadata Extraction done?", default=None
    )
    image_thumbnail: bool | None = Field(
        description="Image Thumbnail Generation done?", default=None
    )
    image_object_detection: bool | None = Field(
        description="Object Detection done?", default=None
    )

    # AUDIO
    audio_metadata: bool | None = Field(
        description="Audio Metadata Extraction done?", default=None
    )
    audio_thumbnail: bool | None = Field(
        description="Audio Thumbnail Generation done?", default=None
    )
    audio_transcription: bool | None = Field(
        description="Transcription done?", default=None
    )

    # VIDEO
    video_metadata: bool | None = Field(
        description="Video Metadata Extraction done?", default=None
    )
    video_thumbnail: bool | None = Field(
        description="Video Thumbnail Generation done?", default=None
    )
    video_audio_extraction: bool | None = Field(
        description="Video Audio Extraction done?", default=None
    )
