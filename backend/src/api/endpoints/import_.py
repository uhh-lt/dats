from typing import Dict, List, TypedDict

from app.celery.background_jobs import prepare_and_start_import_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.import_job import (
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
)
from app.core.data.dto.user import UserRead
from app.core.data.eximport.import_service import (
    ImportJobPreparationError,
    ImportService,
)
from app.core.data.repo.repo_service import RepoService
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

router = APIRouter(
    prefix="/import", dependencies=[Depends(get_current_user)], tags=["import"]
)

ims: ImportService = ImportService()
repo: RepoService = RepoService()


class FileFormat(TypedDict):
    """File format definition for import jobs."""

    mime_types: List[str]
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
import_job_file_formats: Dict[ImportJobType, FileFormat] = {
    ImportJobType.PROJECT: ZIP_FILE_FORMAT,
    ImportJobType.DOCUMENTS: ZIP_FILE_FORMAT,
    ImportJobType.CODES: CSV_FILE_FORMAT,
    ImportJobType.TAGS: CSV_FILE_FORMAT,
    ImportJobType.BBOX_ANNOTATIONS: CSV_FILE_FORMAT,
    ImportJobType.SPAN_ANNOTATIONS: CSV_FILE_FORMAT,
    ImportJobType.SENTENCE_ANNOTATIONS: CSV_FILE_FORMAT,
    ImportJobType.USERS: CSV_FILE_FORMAT,
    ImportJobType.PROJECT_METADATA: CSV_FILE_FORMAT,
    ImportJobType.WHITEBOARDS: CSV_FILE_FORMAT,
    ImportJobType.TIMELINE_ANALYSES: CSV_FILE_FORMAT,
    ImportJobType.COTA: CSV_FILE_FORMAT,
    ImportJobType.MEMOS: CSV_FILE_FORMAT,
}


@router.post(
    "/{project_id}/type/{import_job_type}",
    response_model=ImportJobRead,
    summary="Starts an import job with the given parameters and file",
)
async def start_import_job(
    *,
    project_id: int,
    import_job_type: ImportJobType,
    uploaded_file: UploadFile,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    current_user: UserRead = Depends(get_current_user),
) -> ImportJobRead:
    authz_user.assert_in_project(project_id)

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

    # Store the uploaded file
    suffix = uploaded_file.filename.split(".")[-1]
    filename = f"import_{import_job_type}_{authz_user.user.id}_{project_id}.{suffix}"
    filepath = repo.get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )

    # Start the import job
    return prepare_and_start_import_job_async(
        import_job_params=ImportJobParameters(
            import_job_type=import_job_type,
            project_id=project_id,
            user_id=authz_user.user.id,
            file_name=filename,
        )
    )


@router.get(
    "/{import_job_id}",
    response_model=ImportJobRead,
    summary="Returns the ImportJob for the given ID if it exists",
)
def get_import_job(
    *, import_job_id: str, authz_user: AuthzUser = Depends()
) -> ImportJobRead:
    job = ims.get_import_job(import_job_id=import_job_id)
    authz_user.assert_in_project(job.parameters.project_id)
    return job


@router.get(
    "/project/{project_id}",
    response_model=List[ImportJobRead],
    summary="Returns all ImportJobs for the given project ID if it exists",
)
def get_all_import_jobs(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ImportJobRead]:
    authz_user.assert_in_project(project_id)
    import_jobs = ims.get_all_import_jobs(project_id=project_id)
    import_jobs.sort(key=lambda x: x.created, reverse=True)
    return import_jobs
