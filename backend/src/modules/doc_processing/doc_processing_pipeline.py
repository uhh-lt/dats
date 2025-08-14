from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentUpdate
from loguru import logger
from modules.crawler.crawler_job import CrawlerJobInput, CrawlerJobOutput
from modules.doc_audio_processing.audio_metadata_extraction_job import (
    AudioMetadataExtractionJobInput,
)
from modules.doc_audio_processing.audio_thumbnail_generation_job import (
    AudioThumbnailJobInput,
)
from modules.doc_audio_processing.transcription_job import (
    TranscriptionJobInput,
    TranscriptionJobOutput,
)
from modules.doc_image_processing.image_caption_job import (
    ImageCaptionJobInput,
    ImageCaptionJobOutput,
)
from modules.doc_image_processing.image_embedding_job import ImageEmbeddingJobInput
from modules.doc_image_processing.image_metadata_extraction_job import (
    ImageMetadataExtractionJobInput,
)
from modules.doc_image_processing.image_thumbnail_generation_job import (
    ImageThumbnailJobInput,
)
from modules.doc_processing.archive_extraction_job import (
    ArchiveExtractionJobInput,
    ArchiveExtractionJobOutput,
)
from modules.doc_processing.doc_chunking_job import (
    PDFChunkingJobInput,
    PDFChunkingJobOutput,
)
from modules.doc_processing.init_sdoc_job import SdocInitJobInput, SdocInitJobOutput
from modules.doc_text_processing.detect_language_job import (
    TextLanguageDetectionJobInput,
    TextLanguageDetectionJobOutput,
)
from modules.doc_text_processing.es_index_job import TextESIndexJobInput
from modules.doc_text_processing.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)
from modules.doc_text_processing.html_mapping_job import (
    TextExtractionJobInput,
    TextExtractionJobOutput,
    TextHTMLMappingJobInput,
)
from modules.doc_text_processing.sentence_embedding_job import (
    TextSentenceEmbeddingJobInput,
)
from modules.doc_text_processing.spacy_job import SpacyJobInput, SpacyJobOutput
from modules.doc_video_processing.video_audio_extraction_job import (
    VideoAudioExtractionJobInput,
    VideoAudioExtractionJobOutput,
)
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import JobInputBase, JobOutputBase, SdocJobInput
from systems.job_system.job_service import JobService

js = JobService()


def handle_job_error(job_type: JobType, input: JobInputBase):
    if not isinstance(input, SdocJobInput):
        return

    # Update status: Job X has error
    with SQLRepo().db_session() as db:
        crud_sdoc.update(
            db,
            id=input.sdoc_id,
            update_dto=SourceDocumentUpdate(**{job_type.value: SDocStatus.erroneous}),  # type: ignore
        )


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: JobOutputBase | None
):
    # Jobs without sdoc_id in input
    match job_type:
        case JobType.CRAWLER:
            assert isinstance(input, CrawlerJobInput)
            assert isinstance(output, CrawlerJobOutput)
            logger.info(
                f"Web crawling completed for {input.urls}! Zip stored at {output.crawled_data_zip}"
            )
            js.start_job(
                JobType.EXTRACT_ARCHIVE,
                ArchiveExtractionJobInput(
                    project_id=input.project_id, filepath=output.crawled_data_zip
                ),
            )
        case JobType.SDOC_INIT:
            assert isinstance(input, SdocInitJobInput)
            assert isinstance(output, SdocInitJobOutput)
            logger.info(f"SDoc initialization completed for {input.filepath.name}")
            match input.doctype:
                case DocType.text:
                    js.start_job(
                        JobType.EXTRACT_HTML,
                        ExtractHTMLJobInput(
                            project_id=input.project_id,
                            sdoc_id=output.sdoc_id,
                            filepath=input.filepath,
                            doctype=DocType.text,
                            folder_id=output.folder_id,
                        ),
                    )
                case DocType.image:
                    __start_image_jobs(
                        input.project_id, output.sdoc_id, input.filepath, input.doctype
                    )
                case DocType.audio:
                    __start_audio_jobs(input.project_id, output.sdoc_id, input.filepath)
                case DocType.video:
                    __start_video_jobs(input.project_id, output.sdoc_id, input.filepath)

        case JobType.EXTRACT_ARCHIVE:
            assert isinstance(input, ArchiveExtractionJobInput)
            assert isinstance(output, ArchiveExtractionJobOutput)
            for path, doctype in zip(output.file_paths, output.doctypes):
                if path.suffix == ".pdf":
                    js.start_job(
                        JobType.PDF_CHECKING,
                        PDFChunkingJobInput(project_id=input.project_id, filename=path),
                    )
                else:
                    data = SdocInitJobInput(
                        project_id=input.project_id,
                        doctype=doctype,
                        filepath=path,
                        folder_id=None,
                    )
                    js.start_job(JobType.SDOC_INIT, data)
        case JobType.PDF_CHECKING:
            assert isinstance(input, PDFChunkingJobInput)
            assert isinstance(output, PDFChunkingJobOutput)
            for path in output.files:
                data = SdocInitJobInput(
                    project_id=input.project_id,
                    doctype=DocType.text,
                    filepath=path,
                    folder_id=output.folder_id,
                )
                js.start_job(JobType.SDOC_INIT, data)

    if not isinstance(input, SdocJobInput):
        return

    # Update status: Job X has been completed successfully
    with SQLRepo().db_session() as db:
        crud_sdoc.update(
            db,
            id=input.sdoc_id,
            update_dto=SourceDocumentUpdate(**{job_type.value: SDocStatus.finished}),  # type: ignore
        )

    # Jobs requiring sdoc_id are below:
    match job_type:
        case JobType.EXTRACT_HTML:
            assert isinstance(input, ExtractHTMLJobInput)
            assert isinstance(output, ExtractHTMLJobOutput)
            js.start_job(
                JobType.TEXT_EXTRACTION,
                TextExtractionJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    html=output.html,
                    filename=input.filepath.name,
                    doctype=input.doctype,
                ),
            )
            for path in output.image_paths:
                js.start_job(
                    JobType.SDOC_INIT,
                    SdocInitJobInput(
                        project_id=input.project_id,
                        filepath=path,
                        folder_id=output.folder_id,
                        doctype=DocType.image,
                    ),
                )
        case JobType.TEXT_EXTRACTION:
            assert isinstance(input, TextExtractionJobInput)
            assert isinstance(output, TextExtractionJobOutput)
            js.start_job(
                JobType.TEXT_LANGUAGE_DETECTION,
                TextLanguageDetectionJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    text=output.text,
                    doctype=input.doctype,
                    html=input.html,
                ),
            )
            js.start_job(
                JobType.TEXT_ES_INDEX,
                TextESIndexJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    text=output.text,
                    filename=input.filename,
                ),
            )
        case JobType.TEXT_LANGUAGE_DETECTION:
            assert isinstance(input, TextLanguageDetectionJobInput)
            assert isinstance(output, TextLanguageDetectionJobOutput)
            js.start_job(
                JobType.TEXT_SPACY,
                SpacyJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    text=output.text,
                    doctype=input.doctype,
                    language=output.language,
                    html=input.html,
                ),
            )
        case JobType.TEXT_SPACY:
            assert isinstance(input, SpacyJobInput)
            assert isinstance(output, SpacyJobOutput)
            js.start_job(
                JobType.TEXT_HTML_MAPPING,
                TextHTMLMappingJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    raw_html=input.html,
                    sentence_starts=output.sentence_starts,
                    sentence_ends=output.sentence_ends,
                    token_starts=output.token_starts,
                    token_ends=output.token_ends,
                ),
            )
            js.start_job(
                JobType.TEXT_SENTENCE_EMBEDDING,
                TextSentenceEmbeddingJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    sentences=output.sentences,
                ),
            )
        case JobType.VIDEO_AUDIO_EXTRACTION:
            assert isinstance(input, VideoAudioExtractionJobInput)
            assert isinstance(output, VideoAudioExtractionJobOutput)
            js.start_job(
                JobType.AUDIO_TRANSCRIPTION,
                TranscriptionJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    filepath=output.filepath,
                ),
            )
        case JobType.AUDIO_TRANSCRIPTION:
            assert isinstance(input, TranscriptionJobInput)
            assert isinstance(output, TranscriptionJobOutput)
            js.start_job(
                JobType.TEXT_EXTRACTION,
                TextExtractionJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    html=output.html,
                    filename=input.filepath.name,
                    doctype=DocType.audio,
                ),
            )
        case JobType.IMAGE_CAPTION:
            assert isinstance(input, ImageCaptionJobInput)
            assert isinstance(output, ImageCaptionJobOutput)
            js.start_job(
                JobType.TEXT_EXTRACTION,
                TextExtractionJobInput(
                    project_id=input.project_id,
                    sdoc_id=input.sdoc_id,
                    html=output.html,
                    filename=input.filepath.name,
                    doctype=DocType.image,
                ),
            )


def __start_image_jobs(project_id: int, sdoc_id: int, filepath: Path, doctype: DocType):
    js.start_job(
        JobType.IMAGE_CAPTION,
        ImageCaptionJobInput(project_id=project_id, sdoc_id=sdoc_id, filepath=filepath),
    )
    js.start_job(
        JobType.IMAGE_EMBEDDING,
        ImageEmbeddingJobInput(project_id=project_id, sdoc_id=sdoc_id),
    )
    js.start_job(
        JobType.IMAGE_METADATA_EXTRACTION,
        ImageMetadataExtractionJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath, doctype=doctype
        ),
    )
    js.start_job(
        JobType.IMAGE_OBJECT_DETECTION,
        ImageMetadataExtractionJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath, doctype=doctype
        ),
    )
    js.start_job(
        JobType.IMAGE_THUMBNAIL,
        ImageThumbnailJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )


def __start_audio_jobs(project_id: int, sdoc_id: int, filepath: Path):
    js.start_job(
        JobType.AUDIO_METADATA_EXTRACTION,
        AudioMetadataExtractionJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )
    js.start_job(
        JobType.AUDIO_TRANSCRIPTION,
        TranscriptionJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )
    js.start_job(
        JobType.AUDIO_THUMBNAIL,
        AudioThumbnailJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )


def __start_video_jobs(project_id: int, sdoc_id: int, filepath: Path):
    js.start_job(
        JobType.VIDEO_METADATA_EXTRACTION,
        AudioMetadataExtractionJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )
    js.start_job(
        JobType.VIDEO_THUMBNAIL,
        AudioThumbnailJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )
    js.start_job(
        JobType.VIDEO_AUDIO_EXTRACTION,
        VideoAudioExtractionJobInput(
            project_id=project_id, sdoc_id=sdoc_id, filepath=filepath
        ),
    )
