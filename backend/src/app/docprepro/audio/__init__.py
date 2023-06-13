from pathlib import Path
from typing import Any, List

from celery import Signature

from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.text import (
    add_custom_html_tags,
    clean_html,
    create_sdoc_links_from_html,
    detect_language,
    extract_text_from_html_and_create_source_mapping,
    finish_preprocessing,
    generate_span_annotations,
    index_text_document_in_faiss,
    resolve_sdoc_links,
    store_document_in_elasticsearch,
    store_metadata_in_db,
    store_span_annotations_in_db,
)

# Flo: Task names (as they could be imported)
import_audio_document = "app.docprepro.audio.preprocess.import_audio_document"
convert_to_pcm = "app.docprepro.audio.preprocess.convert_to_pcm"
generate_word_level_transcriptions = (
    "app.docprepro.audio.preprocess.generate_word_level_transcriptions"
)
generate_webp_thumbnails = "app.docprepro.audio.preprocess.generate_webp_thumbnails"
generate_and_import_transcript_file = (
    "app.docprepro.audio.preprocess.generate_and_import_transcript_file"
)


def audio_document_preprocessing_apply_async(
    doc_file_path: Path, project_id: int, mime_type: str
) -> Any:
    audio_document_preprocessing = (
        Signature(
            import_audio_document,
            kwargs={
                "doc_file_path": doc_file_path,
                "project_id": project_id,
                "mime_type": mime_type,
            },
        )
        | Signature(convert_to_pcm)
        | Signature(generate_word_level_transcriptions)
        | Signature(generate_webp_thumbnails)
        | Signature(generate_and_import_transcript_file)
        |
        # Text pipeline
        Signature(clean_html)
        | Signature(extract_text_from_html_and_create_source_mapping)
        | Signature(detect_language)
        | Signature(generate_span_annotations)
        | Signature(create_sdoc_links_from_html)
        | Signature(add_custom_html_tags)
        | Signature(store_metadata_in_db)
        | Signature(store_span_annotations_in_db)
        | Signature(store_document_in_elasticsearch)
        | Signature(index_text_document_in_faiss)
        | Signature(resolve_sdoc_links)
        | Signature(finish_preprocessing)
    )
    return audio_document_preprocessing.apply_async()


def audio_document_preprocessing_without_import_apply_async(
    ppads: List[PreProAudioDoc],
) -> Any:
    audio_document_preprocessing = (
        Signature(convert_to_pcm, kwargs={"ppads": ppads})
        | Signature(generate_word_level_transcriptions)
        | Signature(generate_webp_thumbnails)
        | Signature(generate_and_import_transcript_file)
        |
        # Text pipeline
        Signature(clean_html)
        | Signature(extract_text_from_html_and_create_source_mapping)
        | Signature(detect_language)
        | Signature(generate_span_annotations)
        | Signature(create_sdoc_links_from_html)
        | Signature(add_custom_html_tags)
        | Signature(store_metadata_in_db)
        | Signature(store_span_annotations_in_db)
        | Signature(store_document_in_elasticsearch)
        | Signature(index_text_document_in_faiss)
        | Signature(resolve_sdoc_links)
        | Signature(finish_preprocessing)
    )
    return audio_document_preprocessing.apply_async()
