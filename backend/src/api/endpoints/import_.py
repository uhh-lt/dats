from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.dependencies import get_current_user
from app.celery.background_jobs import prepare_and_start_import_codes_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.import_job import (
    ImportJobParameters,
    ImportJobRead,
)
from app.core.data.import_.import_service import ImportService
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/import", dependencies=[Depends(get_current_user)], tags=["import"]
)

ims: ImportService = ImportService()
repo: RepoService = RepoService()


@router.post(
    "/{proj_id}/codes",
    response_model=ImportJobRead,
    summary="Returns the ImportJob for the given Parameters",
)
def start_import_codes_job(
    *,
    # Ahmad: Since we're uploading a file we have to use multipart/form-data directly in the router method (see project put)
    proj_id: int,
    uploaded_file: UploadFile = File(
        ...,
        description=("CSV file of codes that gets uploaded into project"),
    ),
    authz_user: AuthzUser = Depends(),
) -> ImportJobRead:
    authz_user.assert_in_project(proj_id)
    if not uploaded_file:
        raise HTTPException(
            status_code=418,
            detail="Missing codes file.",
        )
    if not __is_file_csv(uploaded_file=uploaded_file):
        raise HTTPException(
            status_code=415,
            detail="Codes need to be in csv format.",
        )
    user_id = authz_user.user.id
    filename = f"import_user_code_{proj_id}_{user_id}.csv"
    filepath = repo._get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )

    import_job_params = ImportJobParameters(
        proj_id=proj_id, filename=filename, user_id=user_id
    )
    return prepare_and_start_import_codes_job_async(import_job_params=import_job_params)


def __is_file_csv(uploaded_file: UploadFile):
    return uploaded_file.content_type == "text/csv"
