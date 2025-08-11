from enum import Enum


class JobType(str, Enum):
    name: str
    description: str

    def __new__(cls, name: str, description: str = ""):
        obj = str.__new__(cls, name)
        obj._value_ = name
        obj.description = description
        return obj

    EXTRACT_ARCHIVE = ("extract_archive", "")
    TEXT_INIT = ("text_init", "Init text doc")
    EXTRACT_HTML = ("extract_html", "Extract HTML")
    EXTRACT_PLAIN_TEXT = ("extract_text", "")
    IMAGE_SDOC = ("image_sdoc", "create image sdoc")
    IMAGE_METADATA_EXTRACTION = ("image_metadata", "")
    IMAGE_EMBEDDING = ("image_embedding", "")
    IMAGE_THUMBNAIL = ("image_thumbnail", "")
    IMAGE_OBJECT_DETECTION = ("object_detection", "")
    PDF_CHECKING = ("pdf_checking", "")
    COTA_REFINEMENT = ("cota_refinement", "")
    AUDIO_SDOC = ("audio_sdoc", "")
    AUDIO_METADATA_EXTRACTION = ("audio_metadata_extraction", "")
    AUDIO_THUMBNAIL = ("audio_thumbnail", "")
    AUDIO_TRANSCRIPTION = ("audio_transcription", "")
    IMAGE_CAPTION = ("image_caption", "")
    HTML_MAPPING = ("html_mapping", "")
    ES_INDEX = ("es_index", "")
    DETECT_LANGUAGE = ("lang_detect", "")
    SENTENCE_EMBEDDING = ("sentence_embedding", "")
    SPACY = ("spacy", "")
    VIDEO_SDOC = ("video_sdoc", "")
    VIDEO_METADATA_EXTRACTION = ("video_metadata", "")
    VIDEO_THUMBNAIL = ("video_thumbnail", "")
    DUPLICATE_FINDER = ("duplicate_finder", "")
    EXPORT = ("export", "")
    IMPORT = ("import", "")
    LLM_ASSISTANT = ("llm_assistant", "")
    ML = ("ml", "")
    PERSPECTIVES = ("perspectives", "")
