from common.doc_type import (
    DocType,
    get_doc_type,
    is_archive_file,
    mime_type_supported,
)
from common.job_type import JobType
from common.singleton_meta import SingletonMeta
from fastapi import HTTPException, UploadFile
from modules.doc_processing.entrypoints.archive_extraction_job import (
    ArchiveExtractionJobInput,
)
from modules.doc_processing.entrypoints.doc_chunking_job import DocChunkingJobInput
from modules.doc_processing.entrypoints.init_sdoc_job import SdocInitJobInput
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService


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
    ) -> Job:
        # store uploaded files
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
                return self.js.start_job(
                    JobType.EXTRACT_ARCHIVE,
                    ArchiveExtractionJobInput(
                        project_id=project_id, filepath=file_path
                    ),
                )

            doc_type = get_doc_type(mime_type=mime_type)
            if doc_type is None:
                raise HTTPException(
                    detail=f"Document with MIME type {mime_type} not supported!",
                    status_code=406,
                )
            elif doc_type == DocType.text:
                return self.js.start_job(
                    JobType.DOC_CHUNKING,
                    DocChunkingJobInput(project_id=project_id, filepath=file_path),
                )
            else:
                return self.js.start_job(
                    job_type=JobType.SDOC_INIT,
                    payload=SdocInitJobInput(
                        project_id=project_id,
                        filepath=file_path,
                        doctype=doc_type,
                        folder_id=None,
                    ),
                )
        raise HTTPException(
            detail="No files were processed or no job was started.",
            status_code=400,
        )
