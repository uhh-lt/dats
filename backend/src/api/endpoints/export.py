from typing import List

from fastapi import APIRouter, Body
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.export.export_format import ExportFormat
from app.core.data.export.export_service import ExportService
from app.core.data.dto.util import MultipleIdsParameter

router = APIRouter(prefix="/export")
tags = ["export"]

es: ExportService = ExportService()


@router.get(
    "/adoc/{adoc_id}",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download the exported AnnotationDocument",
    description="Returns a URL to download the exported AnnotationDocument with the given ID if it exists",
)
async def export_adoc_by_id(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_adoc(db=db, adoc_id=adoc_id, export_format=export_format)


@router.post(
    "/adoc",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download the exported AnnotationDocuments",
    description="Returns a URL to download the exported AnnotationDocuments with the given IDs",
)
async def export_adoc_by_ids(
    *,
    db: Session = Depends(get_db_session),
    adoc_ids: MultipleIdsParameter,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_adocs(db=db, adoc_ids=adoc_ids.ids, export_format=export_format)


@router.get(
    "/memo/{memo_id}",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download the exported Memo",
    description="Returns a URL to download the exported Memo with the given ID if it exists",
)
async def export_memo_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_memo(db=db, memo_id=memo_id, export_format=export_format)


@router.get(
    "/project/{proj_id}/users",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download all data from all users in the project",
    description="Returns a URL to download all data from all users in the project",
)
async def export_all_user_data_from_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_all_user_data_from_proj(
        db=db, proj_id=proj_id, export_format=export_format
    )


@router.get(
    "/project/{proj_id}/logbook/{user_id}",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download the logbook of the user in the project",
    description="Returns a URL to download the logbook of the user in the project",
)
async def export_user_logbook_from_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    user_id: int,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_logbook_memo(db=db, proj_id=proj_id, user_id=user_id)


@router.get(
    "/project/{proj_id}/codes",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download all Codes from all users in the project",
    description="Returns a URL to download all Codes from all users in the project",
)
async def export_all_codes_from_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_project_codes(db=db, proj_id=proj_id, export_format=export_format)


@router.get(
    "/project/{proj_id}/tags",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download all DocumentTags in the project",
    description="Returns a URL to download all DocumentTags in the project",
)
async def export_all_tags_from_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_project_tags(db=db, proj_id=proj_id, export_format=export_format)


@router.get(
    "/project/{proj_id}/user/{user_id}",
    tags=tags,
    response_model=str,
    summary="Returns a URL to download all data from the user in the project",
    description="Returns a URL to download all data from the user in the project",
)
async def export_user_data_from_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    user_id: int,
    export_format: ExportFormat = ExportFormat.CSV,
) -> str:
    # TODO Flo: only if the user has access?
    return es.export_user_data_from_proj(
        db=db, proj_id=proj_id, user_id=user_id, export_format=export_format
    )
