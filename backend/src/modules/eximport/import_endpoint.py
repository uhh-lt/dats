from typing import TypedDict

from fastapi import Depends, UploadFile

from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_job_dto import ImportJobInput, ImportJobRead
from modules.eximport.import_service import ImportJobPreparationError, ImportService
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.job_system.job_service import JobService

router = project_router("/jobs/import", tags=["job"])

ims: ImportService = ImportService()
js: JobService = JobService()


class FileFormat(TypedDict):
    """File format definition for import jobs."""

    mime_types: list[str]
    suffix: str


ZIP_FILE_FORMAT: FileFormat = {
    "mime_types": [
        "application/zip",
        "application/x-zip",
        "application/x-zip-compressed",
        "application/x-compress",
        "application/x-compressed",
        "application/octet-stream",
        "multipart/x-zip",
    ],
    "suffix": ".zip",
}

CSV_FILE_FORMAT: FileFormat = {
    "mime_types": [
        "text/csv",
        "application/csv",
        "application/vnd.ms-excel",
    ],
    "suffix": ".csv",
}

# Single mapping for file format information by import job type
import_job_file_formats: dict[ImportJobType, FileFormat] = {
    ImportJobType.PROJECT: ZIP_FILE_FORMAT,
    ImportJobType.DOCUMENTS: ZIP_FILE_FORMAT,
    ImportJobType.CODES: CSV_FILE_FORMAT,
    ImportJobType.TAGS: CSV_FILE_FORMAT,
    ImportJobType.FOLDERS: CSV_FILE_FORMAT,
    ImportJobType.BBOX_ANNOTATIONS: CSV_FILE_FORMAT,
    ImportJobType.SPAN_ANNOTATIONS: CSV_FILE_FORMAT,
    ImportJobType.SENTENCE_ANNOTATIONS: CSV_FILE_FORMAT,
    ImportJobType.USERS: CSV_FILE_FORMAT,
    ImportJobType.PROJECT_METADATA: CSV_FILE_FORMAT,
    ImportJobType.WHITEBOARDS: CSV_FILE_FORMAT,
    ImportJobType.TIMELINE_ANALYSES: CSV_FILE_FORMAT,
    ImportJobType.COTA: CSV_FILE_FORMAT,
    ImportJobType.MEMOS: CSV_FILE_FORMAT,
    ImportJobType.PROMPTS: CSV_FILE_FORMAT,
}


# --- job operations


@router.post(
    "",
    response_model=ImportJobRead,
    summary="Starts an import job with the given parameters and file",
)
def start_import_job(
    *,
    project_id: int,
    import_job_type: ImportJobType,
    uploaded_file: UploadFile,
    authz_user: AuthzUser = Depends(),
) -> ImportJobRead:
    file_format = import_job_file_formats[import_job_type]

    # Based on the import job type, check the file type and contents
    if uploaded_file.content_type not in file_format["mime_types"]:
        raise ImportJobPreparationError(
            cause=Exception(
                f"Invalid file type for import job {import_job_type}. Expected one of {file_format['mime_types']}, but got {uploaded_file.content_type}"
            )
        )

    # Check the file suffix
    if uploaded_file.filename and not uploaded_file.filename.endswith(
        file_format["suffix"]
    ):
        raise ImportJobPreparationError(
            cause=Exception(
                f"Invalid file suffix for import job {import_job_type}. Expected {file_format['suffix']}, but got {uploaded_file.filename}"
            )
        )

    if uploaded_file.filename is None:
        raise ImportJobPreparationError(
            cause=Exception("Uploaded file has no filename")
        )

    # Stage the uploaded file in a temporary folder, the import job deletes it
    suffix = uploaded_file.filename.split(".")[-1]
    filename = f"import_{import_job_type}_{authz_user.user.id}_{project_id}.{suffix}"
    temporary_file_id = crud_temporary_file.create()
    crud_temporary_file.store_upload(
        id=temporary_file_id, upload=uploaded_file, name=filename
    )

    # Start the import job
    job = js.start_job(
        job_type="import",
        payload=ImportJobInput(
            import_job_type=import_job_type,
            project_id=project_id,
            user_id=authz_user.user.id,
            temporary_file_id=temporary_file_id,
            file_name=filename,
        ),
    )
    return ImportJobRead.from_rq_job(job)
