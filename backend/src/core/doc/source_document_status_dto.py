from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase


class SourceDocumenStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    spacy: bool = Field(description="Spacy done?")
    es_index: bool = Field(description="ES Index done?")
    lang_detect: bool = Field(description="ES Index done?")


class SourceDocumentStatusRead(SourceDocumenStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentStatusCreate(SourceDocumenStatusBaseDTO):
    pass


class SourceDocumentStatusUpdate(BaseModel, UpdateDTOBase):
    # TEXT
    spacy: bool | None = Field(description="Spacy done?", default=None)
    es_index: bool | None = Field(description="ES Index done?", default=None)
    lang_detect: bool | None = Field(
        description="Language Detection done?", default=None
    )
    html_mapping: bool | None = Field(description="HTML Mapping done?", default=None)
    html_extraction: bool | None = Field(
        description="HTML Extraction done?", default=None
    )
    sentence_embedding: bool | None = Field(
        description="Sentence Embedding done?", default=None
    )

    # IMAGES
    image_caption: bool | None = Field(
        description="Image Captioning done?", default=None
    )
    image_embedding: bool | None = Field(
        description="Image Embedding done?", default=None
    )
    image_metadata: bool | None = Field(
        description="Image Metadata Extraction done?", default=None
    )
    image_thumbnail: bool | None = Field(
        description="Image Thumbnail Generation done?", default=None
    )
    object_detection: bool | None = Field(
        description="Object Detection done?", default=None
    )

    # AUDIO
    audio_metadata: bool | None = Field(
        description="Audio Metadata Extraction done?", default=None
    )
    audio_thumbnail: bool | None = Field(
        description="Audio Thumbnail Generation done?", default=None
    )
    transcription: bool | None = Field(description="Transcription done?", default=None)

    # VIDEO
    video_metadata: bool | None = Field(
        description="Video Metadata Extraction done?", default=None
    )
    video_thumbnail: bool | None = Field(
        description="Video Thumbnail Generation done?", default=None
    )
