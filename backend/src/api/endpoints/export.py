from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.dto.export_job import (
    ExportFormat,
    ExportJobParameters,
    ExportJobRead,
)
from app.core.data.export.export_service import ExportService
from app.core.data.dto.util import MultipleIdsParameter
from app.docprepro.heavy_jobs import prepare_and_start_export_job_async

router = APIRouter(prefix="/export")
tags = ["export"]

exs: ExportService = ExportService()


@router.post(
    "",
    tags=tags,
    response_model=ExportJobRead,
    summary="Returns the ExportJob for the given Parameters",
    description="Returns the ExportJob for the given Parameters",
)
async def start_export_job(
    *,
    export_params: ExportJobParameters,
) -> ExportJobRead:
    # TODO Flo: only if the user has access?
    return prepare_and_start_export_job_async(export_params=export_params)


@router.get(
    "/{export_job_id}",
    tags=tags,
    response_model=ExportJobRead,
    summary="Returns the ExportJob for the given ID",
    description="Returns the ExportJob for the given ID if it exists",
)
async def get_export_job(
    *,
    export_job_id: str,
) -> ExportJobRead:
    # TODO Flo: only if the user has access?
    return exs.get_export_job(export_job_id=export_job_id)
