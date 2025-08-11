from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from loguru import logger
from modules.doc_image_processing.image_sdoc_job import ImageSdocJobInput
from modules.doc_processing.archive_extraction_job import (
    ArchiveExtractionJobInput,
    ArchiveExtractionJobOutput,
)
from modules.doc_processing.text_init_job import TextInitJobInput, TextInitJobOutput
from modules.doc_text_processing.detect_language_job import (
    DetectLanguageJobInput,
    DetectLanguageJobOutput,
)
from modules.doc_text_processing.es_index_job import ESIndexJobInput
from modules.doc_text_processing.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)
from modules.doc_text_processing.html_mapping_job import (
    ExtractPlainTextJobInput,
    ExtractPlainTextJobOutput,
    HTMLMappingJobInput,
)
from modules.doc_text_processing.sentence_embedding_job import SentenceEmbeddingJobInput
from modules.doc_text_processing.spacy_job import SpacyJobInput, SpacyJobOutput
from pydantic import BaseModel
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService

js = JobService()


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: BaseModel | None
):
    sdoc_id = getattr(input, "sdoc_id", getattr(output, "sdoc_id", None))
    if sdoc_id is not None:
        with SQLRepo().db_session() as db:
            crud_sdoc_status.update(
                db,
                id=sdoc_id,
                update_dto=SourceDocumentStatusUpdate(**{job_type.value: True}),
            )

    # Jobs without sdoc_id
    match job_type:
        case JobType.TEXT_INIT:
            assert isinstance(input, TextInitJobInput)
            assert isinstance(output, TextInitJobOutput)
            logger.info(f"Text initialization completed for {input.filepath.name}")
            js.start_job(
                job_type=JobType.EXTRACT_HTML,
                payload=ExtractHTMLJobInput(
                    project_id=input.project_id,
                    sdoc_id=output.sdoc_id,
                    filepath=input.filepath,
                    doctype=DocType.text,
                ),
            )
        case JobType.EXTRACT_ARCHIVE:
            assert isinstance(input, ArchiveExtractionJobInput)
            assert isinstance(output, ArchiveExtractionJobOutput)
            for path, jobtype in zip(output.file_paths, output.job_types):
                match jobtype:
                    case JobType.TEXT_INIT:
                        payload = TextInitJobInput(
                            project_id=input.project_id, filepath=path
                        )
                    # TODO image, video, audio
                js.start_job(jobtype, payload)

    assert sdoc_id is not None, "sdoc_id must be set"

    # Jobs requiring sdoc_id are below:
    match job_type:
        case JobType.EXTRACT_HTML:
            assert isinstance(input, ExtractHTMLJobInput)
            assert isinstance(output, ExtractHTMLJobOutput)
            js.start_job(
                job_type=JobType.EXTRACT_PLAIN_TEXT,
                payload=ExtractPlainTextJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    html=output.html,
                    filename=input.filepath.name,
                    doctype=input.doctype,
                ),
            )
            # FIXME: create folder... in EXTRACT_HTML job?
            folder_id = -1
            for path in output.image_paths:
                js.start_job(
                    job_type=JobType.IMAGE_SDOC,
                    payload=ImageSdocJobInput(
                        project_id=input.project_id,
                        filepath=path,
                        folder_id=folder_id,
                    ),
                )
        case JobType.EXTRACT_PLAIN_TEXT:
            assert isinstance(input, ExtractPlainTextJobInput)
            assert isinstance(output, ExtractPlainTextJobOutput)
            js.start_job(
                job_type=JobType.DETECT_LANGUAGE,
                payload=DetectLanguageJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    text=output.text,
                    doctype=input.doctype,
                    html=input.html,
                ),
            )
            js.start_job(
                job_type=JobType.ES_INDEX,
                payload=ESIndexJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    text=output.text,
                    filename=input.filename,
                ),
            )
        case JobType.DETECT_LANGUAGE:
            assert isinstance(input, DetectLanguageJobInput)
            assert isinstance(output, DetectLanguageJobOutput)
            js.start_job(
                job_type=JobType.SPACY,
                payload=SpacyJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    text=output.text,
                    doctype=input.doctype,
                    language=output.language,
                    html=input.html,
                ),
            )
        case JobType.SPACY:
            assert isinstance(input, SpacyJobInput)
            assert isinstance(output, SpacyJobOutput)
            js.start_job(
                job_type=JobType.HTML_MAPPING,
                payload=HTMLMappingJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    raw_html=input.html,
                    sentence_starts=output.sentence_starts,
                    sentence_ends=output.sentence_ends,
                    token_starts=output.token_starts,
                    token_ends=output.token_ends,
                ),
            )
            js.start_job(
                job_type=JobType.SENTENCE_EMBEDDING,
                payload=SentenceEmbeddingJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    sentences=output.sentences,
                ),
            )
