from typing import List

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
from app.core.data.import_.import_service import ImportService
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/import", dependencies=[Depends(get_current_user)], tags=["import"]
)

ims: ImportService = ImportService()
repo: RepoService = RepoService()


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
    # TODO:

    # Store the uploaded file
    filename = f"import_{import_job_type}_{authz_user.user.id}_{project_id}.csv"
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


def __is_file_csv(uploaded_file: UploadFile):
    return uploaded_file.content_type == "text/csv"


def __is_file_json(uploaded_file: UploadFile):
    return uploaded_file.content_type == "application/json"


def __is_file_zip(uploaded_file: UploadFile):
    return uploaded_file.content_type == "application/zip"
