from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from app.celery.background_jobs import prepare_and_start_export_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.export_job import (
    ExportJobParameters,
    ExportJobRead,
)
from app.core.data.export.export_service import ExportService

router = APIRouter(
    prefix="/export", dependencies=[Depends(get_current_user)], tags=["export"]
)

exs: ExportService = ExportService()


@router.post(
    "",
    response_model=ExportJobRead,
    summary="Returns the ExportJob for the given Parameters",
)
def start_export_job(
    *, export_params: ExportJobParameters, authz_user: AuthzUser = Depends()
) -> ExportJobRead:
    authz_user.assert_in_project(
        export_params.specific_export_job_parameters.project_id
    )

    return prepare_and_start_export_job_async(export_params=export_params)


@router.get(
    "/{export_job_id}",
    response_model=ExportJobRead,
    summary="Returns the ExportJob for the given ID if it exists",
)
def get_export_job(
    *, export_job_id: str, authz_user: AuthzUser = Depends()
) -> ExportJobRead:
    job = exs.get_export_job(export_job_id=export_job_id)
    authz_user.assert_in_project(
        job.parameters.specific_export_job_parameters.project_id
    )

    return job
