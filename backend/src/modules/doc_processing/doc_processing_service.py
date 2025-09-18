from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from common.doc_type import DocType, get_doc_type, is_archive_file, mime_type_supported
from common.job_type import JobType
from common.singleton_meta import SingletonMeta
from core.doc.source_document_orm import SourceDocumentORM
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocHealthResult,
    SdocHealthSort,
    SdocStatusRow,
)
from modules.doc_processing.entrypoints.archive_extraction_job import (
    ArchiveExtractionJobInput,
)
from modules.doc_processing.entrypoints.doc_chunking_job import DocChunkingJobInput
from modules.doc_processing.entrypoints.init_sdoc_job import SdocInitJobInput
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService
from systems.search_system.pagination import apply_pagination


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
        jobs = []
        for uploaded_file in uploaded_files:
            # 1. Check if mime type is ok
            mime_type = uploaded_file.content_type
            if mime_type is None:
                raise HTTPException(
                    detail="Could not determine MIME type of uploaded file!",
                    status_code=406,
                )
            if not mime_type_supported(mime_type=mime_type):
                raise HTTPException(
                    detail=f"Document with MIME type {mime_type} not supported!",
                    status_code=406,
                )

            # 2. store uploaded file
            file_path = self.fsr.store_uploaded_file_in_project_dir(
                proj_id=project_id, uploaded_file=uploaded_file
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
                raise HTTPException(
                    detail=f"Document with MIME type {mime_type} not supported!",
                    status_code=406,
                )
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
            raise HTTPException(
                detail="No files were processed or no job was started.",
                status_code=400,
            )

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
        # query
        query = db.query(SourceDocumentORM).filter(
            SourceDocumentORM.project_id == project_id,
            SourceDocumentORM.doctype == doctype,
        )

        # sorting
        if len(sorts) > 0:
            query = query.order_by(*[s.get_sqlalchemy_expression() for s in sorts])
        else:
            query = query.order_by(SourceDocumentORM.name.asc())

        # pagination
        if page is not None and page_size is not None:
            query, pagination = apply_pagination(
                query=query, page_number=page + 1, page_size=page_size
            )
            total_results = pagination.total_results
            result_rows = query.all()
        # no pagination
        else:
            result_rows = query.all()
            total_results = len(result_rows)

        # transform to dto
        return SdocHealthResult(
            total_results=total_results,
            data=[SdocStatusRow.from_sdoc_orm(sdoc) for sdoc in result_rows],
        )
