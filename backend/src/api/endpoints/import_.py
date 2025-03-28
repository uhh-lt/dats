from typing import Dict, List

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.celery.background_jobs import prepare_and_start_import_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.import_job import (
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
)
from app.core.data.dto.user import UserRead
from app.core.data.eximport.import_service import ImportService
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/import", dependencies=[Depends(get_current_user)], tags=["import"]
)

ims: ImportService = ImportService()
repo: RepoService = RepoService()

expected_file_type: Dict[ImportJobType, List[str]] = {
    ImportJobType.PROJECT: ["application/zip"],
    ImportJobType.CODES: ["application/csv", "application/vnd.ms-excel"],
    ImportJobType.TAGS: ["application/csv", "application/vnd.ms-excel"],
    ImportJobType.BBOX_ANNOTATIONS: ["application/csv", "application/vnd.ms-excel"],
    ImportJobType.SPAN_ANNOTATIONS: ["application/csv", "application/vnd.ms-excel"],
    ImportJobType.SENTENCE_ANNOTATIONS: ["application/csv", "application/vnd.ms-excel"],
    ImportJobType.USERS: ["application/csv", "application/vnd.ms-excel"],
    ImportJobType.PROJECT_METADATA: ["application/csv", "application/vnd.ms-excel"],
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

    # Based on the import job type, check the file type and contents
    if uploaded_file.content_type not in expected_file_type[import_job_type]:
        raise ValueError(
            f"Invalid file type for import job {import_job_type}. Expected one of {expected_file_type[import_job_type]}, but got {uploaded_file.content_type}"
        )

    if uploaded_file.filename is None:
        raise ValueError("Uploaded file has no filename")

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
