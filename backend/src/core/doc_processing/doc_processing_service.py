from collections import defaultdict

from fastapi import UploadFile
from loguru import logger
from sqlalchemy.orm import InstrumentedAttribute, Session

from common.doc_type_enum import DocType
from common.doc_type_utils import get_doc_type, is_archive_file, mime_type_supported
from common.singleton_meta import SingletonMeta
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_file_crud import truncate_filename
from core.doc.source_document_orm import SourceDocumentORM
from core.doc_processing.doc_processing_dto import (
    SdocHealthColumn,
    SdocHealthResult,
    SdocHealthSort,
    SdocInitJobInput,
    SdocStatusRow,
)
from core.doc_processing.doc_processing_exceptions import (
    NoFilesProcessedError,
    SourceDocumentFilenameExistsError,
    StepNotPlannedError,
    UnsupportedMimeTypeError,
    UploadWithoutFilenameError,
)
from core.doc_processing.entrypoints.archive_extraction_job import (
    ArchiveExtractionJobInput,
)
from core.doc_processing.entrypoints.doc_chunking_job import (
    DocChunkingJobInput,
)
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.artefact_system.artefact_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.artefact_service import ArtefactService
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.artefact_system.step_execution import start_steps
from systems.job_system.job_dto import Job, JobOutputBase, JobRead
from systems.job_system.job_service import JobService
from systems.search_system.sorting import SortDirection

SdocPreprocessingJob = JobRead[SdocProcessingJobInput, JobOutputBase | None]


class DocProcessingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.js = JobService()

        return super(DocProcessingService, cls).__new__(cls)

    def start_preprocessing(
        self,
        *,
        db: Session,
        project_id: int,
        uploaded_files: list[UploadFile],
        settings: ProcessingSettings,
    ) -> list[Job]:
        # 1. Check the mime types and filenames of all files before storing any
        # of them, so that a rejected request leaves no files behind. A
        # document with the same filename fails the upload right away (later,
        # the unique constraint of sdoc_init rejects it).
        mime_types = [
            self._get_supported_mime_type(uploaded_file=uploaded_file)
            for uploaded_file in uploaded_files
        ]
        filenames = [
            self._get_filename(uploaded_file=uploaded_file)
            for uploaded_file in uploaded_files
        ]
        for filename in filenames:
            if crud_sdoc.read_by_filename(
                db=db, project_id=project_id, filename=filename, only_finished=False
            ):
                raise SourceDocumentFilenameExistsError(filename=filename)

        jobs = []
        for uploaded_file, mime_type, filename in zip(
            uploaded_files, mime_types, filenames
        ):
            # 2. stage the uploaded file in a temporary folder, the handover
            # to the jobs that create the documents
            temporary_file_id = crud_temporary_file.create()
            crud_temporary_file.store_upload(
                id=temporary_file_id, upload=uploaded_file, name=filename
            )

            # 3. start correct job based on type
            if is_archive_file(mime_type):
                job = self.js.start_job(
                    "extract_archive",
                    ArchiveExtractionJobInput(
                        project_id=project_id,
                        temporary_file_id=temporary_file_id,
                        filename=filename,
                        settings=settings,
                    ),
                )
                jobs.append(job)
                continue

            doc_type = get_doc_type(mime_type=mime_type)
            if doc_type is None:
                raise UnsupportedMimeTypeError(mime_type)
            elif doc_type == DocType.text:
                job = self.js.start_job(
                    "doc_chunking",
                    DocChunkingJobInput(
                        project_id=project_id,
                        temporary_file_id=temporary_file_id,
                        filename=filename,
                        settings=settings,
                    ),
                )
                jobs.append(job)
            else:
                job = self.js.start_job(
                    job_type="sdoc_init",
                    payload=SdocInitJobInput(
                        project_id=project_id,
                        temporary_file_id=temporary_file_id,
                        filename=filename,
                        doctype=doc_type,
                        folder_id=None,
                        settings=settings,
                    ),
                )
                jobs.append(job)

        if len(jobs) == 0:
            raise NoFilesProcessedError()

        return jobs

    def read_health_columns(self, *, doctype: DocType) -> list[SdocHealthColumn]:
        """The columns of the health view of the doctype: its pipeline steps in
        pipeline order, each titled by the artefacts it produces, with whether
        it is a core step."""
        graph = artefact_registry.graph()
        core = set(graph.core_steps(doctype))
        return [
            SdocHealthColumn(
                step=step,
                title=", ".join(
                    a.title
                    for a in sorted(
                        graph.declaration(step).produces, key=lambda a: a.name
                    )
                ),
                core=step in core,
            )
            for step in graph.steps(doctype)
        ]

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
        graph = artefact_registry.graph()
        steps = graph.steps(DocType(doctype))

        # sorting: by the status of a step or by a column of the document
        order_by: list[tuple[str | InstrumentedAttribute, SortDirection]] = []
        for s in sorts:
            if s.column in steps:
                order_by.append((s.column, s.direction))
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
            job_types=steps,
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
                    # a job of a step that is not registered (anymore) is skipped
                    if failed_job.job_type not in graph.all_steps():
                        continue
                    row.failed_job_uuids[failed_job.job_type] = failed_job.job_id
                    row.failed_job_status_msgs[failed_job.job_type] = (
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
        graph = artefact_registry.graph()
        failed_project_jobs = self.js.get_failed_jobs_by_project(
            project_id=project_id,
            job_types=graph.steps(doctype),
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
        # 1. read the documents within the project (raises NoSuchElementError)
        sdocs = crud_sdoc.read_by_ids(db=db, project_id=project_id, ids=sdoc_ids)

        # 2. check that sdocs all have the same doctype
        doctype = sdocs[0].doctype
        for sdoc in sdocs:
            if sdoc.doctype != doctype:
                raise ValueError(
                    f"SDOC '{sdoc.id}' has doctype '{sdoc.doctype}' which is different from doctype '{doctype}' of SDOC '{sdocs[0].id}'"
                )

        # 3. check that processing_step is valid for the doctype
        graph = artefact_registry.graph()
        if processing_step not in graph.steps(DocType(doctype)):
            raise ValueError(
                f"Processing step '{processing_step}' is not valid for doctype '{doctype}'"
            )

        # 4. check that the step of a feature is planned for every document:
        # Recompute never plans it, as its set up may not have run. A missing
        # core step, which every document gets and no feature owns, is planned
        # with all missing core steps of these documents (e.g. documents
        # imported while their core steps ran); the planning starts what can
        # start, the rest starts when its inputs finish.
        step = processing_step
        statuses = crud_sdoc_step_status.read_by_sdocs(db=db, sdoc_ids=sdoc_ids)
        not_planned = sorted(i for i in sdoc_ids if step not in statuses.get(i, {}))
        if not_planned and step not in graph.core_steps(DocType(doctype)):
            raise StepNotPlannedError(step=processing_step, sdoc_ids=not_planned)
        jobs: list[Job] = []
        if not_planned:
            jobs = ArtefactService().plan_core_steps(
                project_id=project_id, sdoc_ids=not_planned, settings=settings
            )

        # 5. start the job of the step for every other document.
        # A document whose job cannot be queued (its input data is missing or
        # the queue cannot be reached) gets the step and the pending steps
        # after it erroneous, and the other documents still start.
        for sdoc_id in sdoc_ids:
            if sdoc_id in not_planned:
                continue
            started = start_steps(
                project_id=project_id,
                sdoc_id=sdoc_id,
                steps=[step],
                settings=settings,
            )
            jobs.extend(job for job in started.values() if job is not None)

        return jobs

    def _get_supported_mime_type(self, *, uploaded_file: UploadFile) -> str:
        mime_type = uploaded_file.content_type
        if mime_type is None or not mime_type_supported(mime_type=mime_type):
            raise UnsupportedMimeTypeError(mime_type)
        return mime_type

    def _get_filename(self, *, uploaded_file: UploadFile) -> str:
        if not uploaded_file.filename:
            raise UploadWithoutFilenameError()
        return truncate_filename(uploaded_file.filename)
