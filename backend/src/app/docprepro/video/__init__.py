from pathlib import Path
from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

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
from app.docprepro.video.models.preprovideodoc import PreProVideoDoc

# Flo: Task names (as they could be imported)
import_video_document = "app.docprepro.video.preprocess.import_video_document"
generate_webp_thumbnails = "app.docprepro.video.preprocess.generate_webp_thumbnails"
create_ppad_from_ppvd = "app.docprepro.video.preprocess.create_ppad_from_ppvd"
convert_to_pcm = "app.docprepro.audio.preprocess.convert_to_pcm"
generate_transcriptions = (
    "app.docprepro.audio.preprocess.generate_word_level_transcriptions"
)
generate_and_import_transcript_file = (
    "app.docprepro.audio.preprocess.generate_and_import_transcript_file"
)


def video_document_preprocessing_apply_async(
    doc_filename: str, project_id: int, mime_type: str
) -> Any:
    video_document_preprocessing = (
        Signature(
            import_video_document,
            kwargs={
                "doc_filename": doc_filename,
                "project_id": project_id,
                "mime_type": mime_type,
            },
        )
        | Signature(generate_webp_thumbnails)
        | Signature(create_ppad_from_ppvd)
        |
        # Audio pipeline
        Signature(convert_to_pcm)
        | Signature(generate_transcriptions)
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

    return video_document_preprocessing.apply_async()


def video_document_preprocessing_without_import_apply_async(
    ppvds: List[PreProVideoDoc],
) -> Any:
    video_document_preprocessing = (
        Signature(generate_webp_thumbnails, kwargs={"ppvds": ppvds})
        | Signature(create_ppad_from_ppvd)
        |
        # Audio pipeline
        Signature(convert_to_pcm)
        | Signature(generate_transcriptions)
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
    return video_document_preprocessing.apply_async()
