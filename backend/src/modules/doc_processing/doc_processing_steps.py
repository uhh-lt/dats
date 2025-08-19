from common.doc_type import (
    DocType,
)

# This has to match doc_processing_pipeline!
# Here, we list which steps/jobs are run per document type

PROCESSING_JOBS = {
    DocType.text: [
        # text
        "extract_html",
        # html
        "text_extraction",
        "text_language_detection",
        "text_spacy",
        "text_es_index",
        "text_sentence_embedding",
        "text_html_mapping",
    ],
    DocType.image: [
        # image
        "image_caption",
        "image_embedding",
        "image_metadata_extraction",
        "image_thumbnail",
        "image_object_detection",
        # html
        "text_extraction",
        "text_language_detection",
        "text_spacy",
        "text_es_index",
        "text_sentence_embedding",
        "text_html_mapping",
    ],
    DocType.audio: [
        # audio
        "audio_metadata",
        "audio_thumbnail",
        "audio_transcription",
        # html
        "text_extraction",
        "text_language_detection",
        "text_spacy",
        "text_es_index",
        "text_sentence_embedding",
        "text_html_mapping",
    ],
    DocType.video: [
        # video
        "video_metadata",
        "video_thumbnail",
        "video_audio_extraction",
        # audio
        "audio_transcription",
        # html
        "text_extraction",
        "text_language_detection",
        "text_spacy",
        "text_es_index",
        "text_sentence_embedding",
        "text_html_mapping",
    ],
}
