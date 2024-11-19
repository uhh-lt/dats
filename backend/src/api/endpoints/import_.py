import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.celery.background_jobs import prepare_and_start_import_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.project import crud_project
from app.core.data.dto.import_job import (
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
)
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserRead
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
    summary="Starts the import codes job on given project id.",
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
    filename = f"import_user_code_{user_id}_{proj_id}.csv"
    filepath = repo.get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )

    import_job_params = ImportJobParameters(
        proj_id=proj_id,
        filename=filename,
        user_id=user_id,
        import_job_type=ImportJobType.SINGLE_USER_ALL_CODES,
    )
    return prepare_and_start_import_job_async(import_job_params=import_job_params)


@router.post(
    "/{proj_id}/tags",
    response_model=ImportJobRead,
    summary="Starts the import tags job on given project.",
)
def start_import_tags_job(
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
    if not __is_file_csv(uploaded_file=uploaded_file):
        raise HTTPException(
            status_code=415,
            detail="Codes need to be in csv format.",
        )
    user_id = authz_user.user.id
    filename = f"import_tags_{user_id}_{proj_id}.csv"
    filepath = repo.get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )

    import_job_params = ImportJobParameters(
        proj_id=proj_id,
        filename=filename,
        user_id=user_id,
        import_job_type=ImportJobType.SINGLE_PROJECT_ALL_TAGS,
    )
    return prepare_and_start_import_job_async(import_job_params=import_job_params)


@router.post(
    "/{proj_id}/project_project_metadata",
    response_model=ImportJobRead,
    summary="Starts the import project project metadata job on given project",
)
def start_import_project_project_metadata_job(
    *,
    # Ahmad: Since we're uploading a file we have to use multipart/form-data directly in the router method (see project put)
    proj_id: int,
    uploaded_file: UploadFile = File(
        ...,
        description=(
            "CSV file of project project metadata that gets uploaded into project"
        ),
    ),
    authz_user: AuthzUser = Depends(),
) -> ImportJobRead:
    authz_user.assert_in_project(proj_id)
    if not __is_file_csv(uploaded_file=uploaded_file):
        raise HTTPException(
            status_code=415,
            detail="Project project metadata need to be in csv format.",
        )
    user_id = authz_user.user.id
    filename = f"import_project_project_metadata_{proj_id}.csv"
    filepath = repo.get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )

    import_job_params = ImportJobParameters(
        proj_id=proj_id,
        filename=filename,
        user_id=user_id,
        import_job_type=ImportJobType.SINGLE_PROJECT_ALL_PROJECT_PROJECT_METADATA,
    )
    return prepare_and_start_import_job_async(import_job_params=import_job_params)


@router.post(
    "/project_metadata",
    response_model=ImportJobRead,
    summary="Starts the import project metadata job on given project",
)
def start_import_project_metadata_job(
    *,
    db: Session = Depends(get_db_session),
    # Ahmad: Since we're uploading a file we have to use multipart/form-data directly in the router method (see project put)
    uploaded_file: UploadFile = File(
        ...,
        description=("Json file of project metadata that gets uploaded into project"),
    ),
    current_user: UserRead = Depends(get_current_user),
) -> ImportJobRead:
    if not __is_file_json(uploaded_file=uploaded_file):
        raise HTTPException(
            status_code=415,
            detail="Project metadata need to be in json format.",
        )
    user_id = current_user.id
    random_temp_project_name = str(uuid.uuid4())
    filename = f"import_project_{random_temp_project_name}_for_user_{user_id}.json"
    filepath = repo.get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )
    project_create = ProjectCreate(title=random_temp_project_name, description="")
    db_obj = crud_project.create(
        db=db, create_dto=project_create, creating_user=current_user
    )

    import_job_params = ImportJobParameters(
        proj_id=db_obj.id,
        filename=filename,
        user_id=user_id,
        import_job_type=ImportJobType.SINGLE_PROJECT_ALL_METADATA,
    )
    return prepare_and_start_import_job_async(import_job_params=import_job_params)


@router.post(
    "",
    response_model=ImportJobRead,
    summary="Starts the import project job on given project",
)
def start_import_project_job(
    *,
    db: Session = Depends(get_db_session),
    uploaded_file: UploadFile = File(
        ...,
        description=("Zip file of project metadata that gets uploaded into project"),
    ),
    current_user: UserRead = Depends(get_current_user),
) -> ImportJobRead:
    if not __is_file_zip(uploaded_file=uploaded_file):
        raise HTTPException(
            status_code=415,
            detail="Project need to be in zip format.",
        )
    user_id = current_user.id
    random_temp_project_name = str(uuid.uuid4())
    filename = f"import_project_{random_temp_project_name}_for_user_{user_id}.zip"
    filepath = repo.get_dst_path_for_temp_file(filename)
    filepath = repo.store_uploaded_file(
        uploaded_file=uploaded_file, filepath=filepath, fn=filename
    )
    project_create = ProjectCreate(title=random_temp_project_name, description="")
    db_obj = crud_project.create(
        db=db, create_dto=project_create, creating_user=current_user
    )

    import_job_params = ImportJobParameters(
        proj_id=db_obj.id,
        filename=filename,
        user_id=user_id,
        import_job_type=ImportJobType.SINGLE_PROJECT,
    )
    return prepare_and_start_import_job_async(import_job_params=import_job_params)


def __is_file_csv(uploaded_file: UploadFile):
    return uploaded_file.content_type == "text/csv"


def __is_file_json(uploaded_file: UploadFile):
    return uploaded_file.content_type == "application/json"


def __is_file_zip(uploaded_file: UploadFile):
    return uploaded_file.content_type == "application/zip"
