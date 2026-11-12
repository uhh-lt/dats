from collections import defaultdict

from fastapi import UploadFile
from loguru import logger
from sqlalchemy.orm import InstrumentedAttribute, Session

from common.doc_type_enum import DocType
from common.doc_type_utils import get_doc_type, is_archive_file, mime_type_supported
from common.job_type_enum import JobType
from common.singleton_meta import SingletonMeta
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocHealthResult,
    SdocHealthSort,
    SdocProcessingJobInput,
    SdocStatusRow,
)
from modules.doc_processing.doc_processing_exceptions import (
    NoFilesProcessedError,
    UnsupportedMimeTypeError,
)
from modules.doc_processing.entrypoints.archive_extraction_job import (
    ArchiveExtractionJobInput,
)
from modules.doc_processing.entrypoints.doc_chunking_job import DocChunkingJobInput
from modules.doc_processing.entrypoints.init_sdoc_job import SdocInitJobInput
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.step_run import start_steps
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobOutputBase, JobRead
from systems.job_system.job_service import JobService
from systems.search_system.sorting import SortDirection

SdocPreprocessingJob = JobRead[SdocProcessingJobInput, JobOutputBase | None]


class DocProcessingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.js = JobService()

        return super(DocProcessingService, cls).__new__(cls)

    def start_preprocessing(
        self,
        *,
        project_id: int,
        uploaded_files: list[UploadFile],
        settings: ProcessingSettings,
    ) -> list[Job]:
        # 1. Check the mime types of all files before storing any of them,
        # so that a rejected request leaves no files behind
        mime_types = [
            self._get_supported_mime_type(uploaded_file=uploaded_file)
            for uploaded_file in uploaded_files
        ]

        jobs = []
        for uploaded_file, mime_type in zip(uploaded_files, mime_types):
            # 2. store uploaded file
            file_path = self.fsr.store_uploaded_file_in_project_dir(
                project_id=project_id, uploaded_file=uploaded_file
            )

            # 3. start correct job based on type
            if is_archive_file(mime_type):
                job = self.js.start_job(
                    JobType.EXTRACT_ARCHIVE,
                    ArchiveExtractionJobInput(
                        project_id=project_id, filepath=file_path, settings=settings
                    ),
                )
                jobs.append(job)
                continue

            doc_type = get_doc_type(mime_type=mime_type)
            if doc_type is None:
                raise UnsupportedMimeTypeError(mime_type)
            elif doc_type == DocType.text:
                job = self.js.start_job(
                    JobType.DOC_CHUNKING,
                    DocChunkingJobInput(
                        project_id=project_id, filepath=file_path, settings=settings
                    ),
                )
                jobs.append(job)
            else:
                job = self.js.start_job(
                    job_type=JobType.SDOC_INIT,
                    payload=SdocInitJobInput(
                        project_id=project_id,
                        filepath=file_path,
                        doctype=doc_type,
                        folder_id=None,
                        settings=settings,
                    ),
                )
                jobs.append(job)

        if len(jobs) == 0:
            raise NoFilesProcessedError()

        return jobs

    def search_sdoc_health(
        self,
        *,
        db: Session,
        project_id: int,
        doctype: str,
        sorts: list[SdocHealthSort],
        page: int | None = None,
        page_size: int | None = None,
    ) -> SdocHealthResult:
        graph = pipeline_registry.graph()
        steps = graph.steps(DocType(doctype))

        # sorting: by the status of a step or by a column of the document
        order_by: list[tuple[JobType | InstrumentedAttribute, SortDirection]] = []
        for s in sorts:
            if s.column in steps:
                order_by.append((JobType(s.column), s.direction))
                continue
            assert hasattr(SourceDocumentORM, s.column), f"Invalid column: {s.column}"
            order_by.append((getattr(SourceDocumentORM, s.column), s.direction))
        offset = limit = None
        if page is not None and page_size is not None:
            offset, limit = page * page_size, page_size
        result_rows = crud_sdoc_step_status.read_sdocs_sorted(
            db=db,
            project_id=project_id,
            doctype=DocType(doctype),
            order_by=order_by,
            offset=offset,
            limit=limit,
        )
        total_results = (
            db.query(SourceDocumentORM)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.doctype == doctype,
            )
            .count()
        )

        # transform to dto
        step_status = crud_sdoc_step_status.read_by_sdocs(
            db=db, sdoc_ids=[sdoc.id for sdoc in result_rows]
        )
        results = SdocHealthResult(
            total_results=total_results,
            data=[
                SdocStatusRow.from_sdoc_orm(sdoc, steps, step_status[sdoc.id])
                for sdoc in result_rows
            ],
        )

        # Retrieve information about failed jobs
        # 1. retrieve all failed jobs in this project
        failed_project_jobs = self.js.get_failed_jobs_by_project(
            project_id=project_id,
            job_types=list(graph.group_by_job(steps)),
        )

        # 2. convert to SdocProcessingJob and build dict for easy access
        failed_jobs_dict: dict[int, list[SdocPreprocessingJob]] = defaultdict(list)
        for job in failed_project_jobs:
            try:
                spj = SdocPreprocessingJob.from_rq_job(job)
            except Exception:
                continue
            failed_jobs_dict[spj.input.sdoc_id].append(spj)

        # 3. populate the results
        for row in results.data:
            if row.sdoc_id in failed_jobs_dict:
                for failed_job in failed_jobs_dict[row.sdoc_id]:
                    # a job with several steps failed all steps it computed
                    for step in graph.job_steps(
                        JobType(failed_job.job_type), failed_job.input.steps
                    ):
                        row.failed_job_uuids[step.value] = failed_job.job_id
                        row.failed_job_status_msgs[step.value] = (
                            failed_job.status_message or ""
                        )

        return results

    def retry_jobs(
        self,
        *,
        project_id: int,
        doctype: DocType,
        sdoc_ids: list[int],
    ) -> str:
        # Retrieve information about failed jobs
        # 1. retrieve all failed jobs in this project
        graph = pipeline_registry.graph()
        failed_project_jobs = self.js.get_failed_jobs_by_project(
            project_id=project_id,
            job_types=list(graph.group_by_job(graph.steps(doctype))),
        )

        # 2. convert to SdocProcessingJob and collect by sdoc_id
        jobs_to_retry: list[SdocPreprocessingJob] = []
        for job in failed_project_jobs:
            try:
                spj = SdocPreprocessingJob.from_rq_job(job)
            except Exception:
                continue
            if spj.input.sdoc_id in sdoc_ids:
                jobs_to_retry.append(spj)

        # Retry the jobs
        successesful_retries = 0
        msgs = []
        for job in jobs_to_retry:
            logger.info(
                f"Retrying job '{job.job_type}' of SDOC '{job.input.sdoc_id}' with UUID '{job.job_id}'..."
            )
            success = self.js.retry_job(job.job_id)
            if success:
                successesful_retries += 1
            if not success:
                msgs.append(
                    f"- Failed to retry job '{job.job_type}' of SDOC '{job.input.sdoc_id}' with UUID '{job.job_id}'!"
                )

        return (
            f"Retried {successesful_retries} / {len(jobs_to_retry)} jobs of {len(sdoc_ids)} document(s) successfully. "
            + "\n".join(msgs)
        )

    def recompute_processing_step(
        self,
        db: Session,
        project_id: int,
        sdoc_ids: list[int],
        settings: ProcessingSettings,
        processing_step: str,
    ) -> list[Job]:
        # Validate inputs
        # 1. check that sdoc_ids are in the given project
        sdocs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        for sdoc in sdocs:
            if sdoc.project_id != project_id:
                raise ValueError(f"SDOC '{sdoc.id}' is not in project '{project_id}'")

        # 2. check that sdocs all have the same doctype
        doctype = sdocs[0].doctype
        for sdoc in sdocs:
            if sdoc.doctype != doctype:
                raise ValueError(
                    f"SDOC '{sdoc.id}' has doctype '{sdoc.doctype}' which is different from doctype '{doctype}' of SDOC '{sdocs[0].id}'"
                )

        # 3. check that processing_step is valid for the doctype
        graph = pipeline_registry.graph()
        if processing_step not in graph.steps(DocType(doctype)):
            raise ValueError(
                f"Processing step '{processing_step}' is not valid for doctype '{doctype}'"
            )

        # Start recompute jobs for the specified processing step: the job that
        # computes the step, for this step only (e.g. text_spacy for text_ner).
        # A job that cannot start raises to the request.
        step = JobType(processing_step)
        jobs: list[Job] = []
        for sdoc_id in sdoc_ids:
            started = start_steps(
                project_id=project_id,
                sdoc_id=sdoc_id,
                steps=[step],
                settings=settings,
                raise_on_failure=True,
            )
            jobs.extend(job for job in started.values() if job is not None)

        return jobs

    def _get_supported_mime_type(self, *, uploaded_file: UploadFile) -> str:
        mime_type = uploaded_file.content_type
        if mime_type is None or not mime_type_supported(mime_type=mime_type):
            raise UnsupportedMimeTypeError(mime_type)
        return mime_type
