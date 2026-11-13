from enum import Enum


class JobType(str, Enum):
    # The order of the pipeline steps breaks ties in the derived step order
    # (modules/doc_processing/pipeline/pipeline_graph.py).

    # entrypoints
    EXTRACT_ARCHIVE = "extract_archive"
    DOC_CHUNKING = "doc_chunking"
    SDOC_INIT = "sdoc_init"

    # text
    EXTRACT_HTML = "extract_html"

    # html
    TEXT_EXTRACTION = "text_extraction"
    TEXT_LANGUAGE_DETECTION = "text_language_detection"
    TEXT_SPACY = "text_spacy"
    # further steps of the text_spacy job (no jobs of their own)
    TEXT_KEYWORDS = "text_keywords"
    TEXT_WORD_FREQUENCY = "text_word_frequency"
    TEXT_NER = "text_ner"
    TEXT_ES_INDEX = "text_es_index"
    TEXT_SENTENCE_EMBEDDING = "text_sentence_embedding"
    TEXT_DOCUMENT_EMBEDDING = "text_document_embedding"
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

    # on-demand jobs (short-lived)
    DUPLICATE_FINDER = "duplicate_finder"
    EXPORT = "export"
    IMPORT = "import"

    # on demand jobs (long-lived)
    ML = "ml"
    CLASSIFIER = "classifier"
    LLM_ASSISTANT = "llm_assistant"
    EXPERIMENT_RUN = "experiment_run"
    CRAWLER = "crawler"
    FEATURE_ACTIVATION = "feature_activation"
    COTA_REFINEMENT = "cota_refinement"
    PERSPECTIVES = "perspectives"
