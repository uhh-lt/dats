from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from common.doc_type import DocType
from common.sdoc_status_enum import SDocStatus
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocHealthResult,
    SdocHealthSort,
    SourceDocumentStatusSimple,
)
from modules.doc_processing.doc_processing_service import DocProcessingService
from modules.doc_processing.doc_processing_steps import PROCESSING_JOBS

router = APIRouter(
    prefix="/docprocessing",
    dependencies=[Depends(get_current_user)],
    tags=["docprocessing"],
)


@router.get(
    "/searchColumns/{doctype}",
    response_model=list[str],
    summary="Get all column names (the job names) for the given document type",
)
def get_search_columns_by_doctype(
    *,
    db: Session = Depends(get_db_session),
    doctype: DocType,
    authz_user: AuthzUser = Depends(),
) -> list[str]:
    return PROCESSING_JOBS[doctype]


@router.post(
    "/project/{proj_id}/search",
    response_model=SdocHealthResult,
    summary="Get all SourceDocumentStatusDetailed for the Project with the given ID by status",
)
def search_sdoc_health(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    doctype: DocType,
    sorts: list[SdocHealthSort],
    page: int,
    page_size: int,
    authz_user: AuthzUser = Depends(),
) -> SdocHealthResult:
    authz_user.assert_in_project(proj_id)
    return DocProcessingService().search_sdoc_health(
        db=db,
        project_id=proj_id,
        doctype=doctype,
        sorts=sorts,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/project/{proj_id}/status/{status}/simple",
    response_model=list[SourceDocumentStatusSimple],
    summary="Get all SourceDocumentStatusSimple for the Project with the given ID by status",
)
def get_simple_sdoc_status_by_project_and_status(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    status: SDocStatus,
    authz_user: AuthzUser = Depends(),
) -> list[SourceDocumentStatusSimple]:
    authz_user.assert_in_project(proj_id)
    return [
        SourceDocumentStatusSimple.model_validate(sdoc)
        for sdoc in crud_sdoc.read_by_project_and_status(
            db=db, project_id=proj_id, status=status
        )
    ]


@router.put(
    "/project/{proj_id}",
    response_model=int,
    summary="Uploads one or multiple files to the Project with the given ID if it exists",
)
def upload_files(
    *,
    proj_id: int,
    settings: str = Form(..., description="ProcessingSettings as JSON string"),
    uploaded_files: list[UploadFile] = File(
        ...,
        description=(
            "File(s) that get uploaded and represented by the SourceDocument(s)"
        ),
    ),
    authz_user: AuthzUser = Depends(),
) -> int:
    try:
        settings_obj = ProcessingSettings.model_validate_json(settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings: {e}")
    authz_user.assert_in_project(proj_id)
    jobs = DocProcessingService().start_preprocessing(
        project_id=proj_id, uploaded_files=uploaded_files, settings=settings_obj
    )
    return len(jobs)
