from enum import Enum


class JobType(str, Enum):
    # KEEP THE SAME ORDER AS source_document_status_orm.py!

    # optional
    EXTRACT_ARCHIVE = "extract_archive"
    PDF_CHECKING = "pdf_checking"

    # init
    SDOC_INIT = "sdoc_init"
    EXTRACT_HTML = "extract_html"

    # html
    TEXT_EXTRACTION = "text_extraction"
    TEXT_LANGUAGE_DETECTION = "text_language_detection"
    TEXT_SPACY = "text_spacy"
    TEXT_ES_INDEX = "text_es_index"
    TEXT_SENTENCE_EMBEDDING = "text_sentence_embedding"
    TEXT_HTML_MAPPING = "text_html_mapping"

    # image
    IMAGE_CAPTION = "image_caption"
    IMAGE_EMBEDDING = "image_embedding"
    IMAGE_METADATA_EXTRACTION = "image_metadata_extraction"
    IMAGE_THUMBNAIL = "image_thumbnail"
    IMAGE_OBJECT_DETECTION = "image_object_detection"

    # audio
    AUDIO_METADATA_EXTRACTION = "audio_metadata"
    AUDIO_THUMBNAIL = "audio_thumbnail"
    AUDIO_TRANSCRIPTION = "audio_transcription"

    # video
    VIDEO_METADATA_EXTRACTION = "video_metadata"
    VIDEO_THUMBNAIL = "video_thumbnail"
    VIDEO_AUDIO_EXTRACTION = "video_audio_extraction"

    # on-demand jobs
    CRAWLER = "crawler"
    DUPLICATE_FINDER = "duplicate_finder"
    EXPORT = "export"
    IMPORT = "import"
    LLM_ASSISTANT = "llm_assistant"
    COTA_REFINEMENT = "cota_refinement"
    ML = "ml"
    PERSPECTIVES = "perspectives"
