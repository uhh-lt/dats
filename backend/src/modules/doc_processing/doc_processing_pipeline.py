from common.doc_type import DocType
from common.job_type import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentUpdate
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.pipeline import pipeline_transitions as t
from modules.doc_processing.pipeline.pipeline_operators import (
    LoopBranchOperator,
    SwitchCaseBranchOperator,
)
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    JobInputBase,
    JobOutputBase,
)
from systems.job_system.job_service import JobService

# --- PREPROCESSING PIPELINE_GRAPH ---
# fmt: off
PIPELINE_GRAPH = {
    JobType.CRAWLER: [
        (t.crawler_to_extract_archive, JobType.EXTRACT_ARCHIVE),
    ],
    # extract archive is called if user uploads zip archive or user triggers the crawler
    JobType.EXTRACT_ARCHIVE: [
        LoopBranchOperator(
            loop_variable=lambda output: output.file_paths,
            next_jobs=[(t.extract_archive_to_pdf_chunking, JobType.DOC_CHUNKING)],
        )
    ],
    # doc chunking is called if text documents are preprocessed
    JobType.DOC_CHUNKING: [
        LoopBranchOperator(
            loop_variable=lambda output: output.files,
            next_jobs=[
                (t.doc_chunking_to_sdoc_init, JobType.SDOC_INIT),
            ],
        ),
    ],
    # sdoc init is called for all kinds of documents
    JobType.SDOC_INIT: [
        SwitchCaseBranchOperator(
            switch_variable=lambda output: output.doctype,
            cases={
                DocType.text: [
                    (t.sdoc_init_to_extract_html, JobType.EXTRACT_HTML),
                ],
                DocType.image: [
                    (t.sdoc_init_to_image_caption, JobType.IMAGE_CAPTION),
                    (t.sdoc_init_to_image_embedding, JobType.IMAGE_EMBEDDING),
                    (t.sdoc_init_to_image_metadata_extraction, JobType.IMAGE_METADATA_EXTRACTION),
                    (t.sdoc_init_to_image_thumbnail, JobType.IMAGE_THUMBNAIL),
                    (t.sdoc_init_to_image_object_detection, JobType.IMAGE_OBJECT_DETECTION),
                ],
                DocType.audio: [
                    (t.sdoc_init_to_audio_metadata_extraction, JobType.AUDIO_METADATA_EXTRACTION),
                    (t.sdoc_init_to_audio_transcription, JobType.AUDIO_TRANSCRIPTION),
                    (t.sdoc_init_to_audio_thumbnail, JobType.AUDIO_THUMBNAIL),
                ],
                DocType.video: [
                    (t.sdoc_init_to_video_metadata_extraction, JobType.VIDEO_METADATA_EXTRACTION),
                    (t.sdoc_init_to_video_thumbnail, JobType.VIDEO_THUMBNAIL),
                    (t.sdoc_init_to_video_audio_extraction, JobType.VIDEO_AUDIO_EXTRACTION),
                ],
            },
        ),
    ],
    # TEXT
    JobType.EXTRACT_HTML: [
        (t.extract_html_to_text_extraction, JobType.TEXT_EXTRACTION),
        LoopBranchOperator(
            loop_variable=lambda output: output.image_paths,
            next_jobs=[
                (t.extract_html_to_image_sdoc_init, JobType.SDOC_INIT),
            ],
        ),
    ],
    # HTML
    JobType.TEXT_EXTRACTION: [
        (t.text_extraction_to_language_detection, JobType.TEXT_LANGUAGE_DETECTION),
        (t.text_extraction_to_es_index, JobType.TEXT_ES_INDEX),
    ],
    JobType.TEXT_LANGUAGE_DETECTION: [
        (t.language_detection_to_spacy, JobType.TEXT_SPACY),
    ],
    JobType.TEXT_SPACY: [
        (t.spacy_to_html_mapping, JobType.TEXT_HTML_MAPPING),
        (t.spacy_to_sentence_embedding, JobType.TEXT_SENTENCE_EMBEDDING),
    ],
    # VIDEO -> AUDIO
    JobType.VIDEO_AUDIO_EXTRACTION: [
        (t.video_audio_extraction_to_audio_transcription, JobType.AUDIO_TRANSCRIPTION),
    ],
    # AUDIO -> TEXT
    JobType.AUDIO_TRANSCRIPTION: [
        (t.audio_transcription_to_text_extraction, JobType.TEXT_EXTRACTION),
    ],
    # IMAGE -> TEXT
    JobType.IMAGE_CAPTION: [
        (t.image_caption_to_text_extraction, JobType.TEXT_EXTRACTION),
    ],
}
# fmt: on


def execute_pipeline_step(job_type: JobType, input, output, job_service):
    steps = PIPELINE_GRAPH.get(job_type, [])
    for step in steps:
        if isinstance(step, SwitchCaseBranchOperator):
            next_jobs = step.get_next_jobs(input, output)
            for transition_fn, next_job_type in next_jobs:
                job_input = transition_fn(input, output)
                job_service.start_job(next_job_type, job_input)
        elif isinstance(step, LoopBranchOperator):
            jobs = step.get_next_jobs(input, output)
            for transition_fn, next_job_type, idx in jobs:
                job_input = transition_fn(input, output, idx)
                job_service.start_job(next_job_type, job_input)
        else:
            transition_fn, next_job_type = step
            job_input = transition_fn(input, output)
            job_service.start_job(next_job_type, job_input)


js = JobService()


def handle_job_error(job_type: JobType, input: JobInputBase):
    if isinstance(input, SdocProcessingJobInput):
        with SQLRepo().db_session() as db:
            crud_sdoc.update(
                db,
                id=input.sdoc_id,
                update_dto=SourceDocumentUpdate(
                    **{job_type.value: SDocStatus.erroneous}  # type: ignore
                ),
            )


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
):
    if isinstance(input, SdocProcessingJobInput):
        with SQLRepo().db_session() as db:
            crud_sdoc.update(
                db,
                id=input.sdoc_id,
                update_dto=SourceDocumentUpdate(
                    **{job_type.value: SDocStatus.finished}  # type: ignore
                ),
            )

    execute_pipeline_step(job_type=job_type, input=input, output=output, job_service=js)
