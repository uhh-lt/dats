from enum import Enum

# TODO the names must match the name of the columns in SdocProcessingStatus


class JobType(str, Enum):
    name: str
    description: str

    def __new__(cls, name: str, description: str = "", queue: str = "default"):
        obj = str.__new__(cls, name)
        obj._value_ = name
        obj.description = description
        obj.queue = queue
        return obj

    # pre-processing pipeline jobs
    EXTRACT_ARCHIVE = ("extract_archive", "")
    PDF_CHECKING = ("pdf_checking", "")
    SDOC_INIT = ("sdoc_init", "Init source doc")
    EXTRACT_HTML = ("html_extraction", "Extract HTML")
    EXTRACT_PLAIN_TEXT = ("text_extraction", "")
    DETECT_LANGUAGE = ("lang_detect", "")
    SPACY = ("spacy", "", "cpu")
    ES_INDEX = ("es_index", "")
    SENTENCE_EMBEDDING = ("sentence_embedding", "", "gpu")
    HTML_MAPPING = ("html_mapping", "")
    AUDIO_METADATA_EXTRACTION = ("audio_metadata", "")
    AUDIO_THUMBNAIL = ("audio_thumbnail", "")
    AUDIO_TRANSCRIPTION = ("transcription", "", "gpu")
    IMAGE_CAPTION = ("image_caption", "", "gpu")
    IMAGE_METADATA_EXTRACTION = ("image_metadata", "")
    IMAGE_EMBEDDING = ("image_embedding", "", "gpu")
    IMAGE_THUMBNAIL = ("image_thumbnail", "")
    IMAGE_OBJECT_DETECTION = ("object_detection", "", "gpu")
    VIDEO_METADATA_EXTRACTION = ("video_metadata", "")
    VIDEO_THUMBNAIL = ("video_thumbnail", "")
    VIDEO_AUDIO_EXTRACTION = ("video_audio_extraction", "")

    # on-demand jobs
    DUPLICATE_FINDER = ("duplicate_finder", "")
    EXPORT = ("export", "")
    IMPORT = ("import", "")
    LLM_ASSISTANT = ("llm_assistant", "")
    COTA_REFINEMENT = ("cota_refinement", "")
    ML = ("ml", "")
    PERSPECTIVES = ("perspectives", "")
