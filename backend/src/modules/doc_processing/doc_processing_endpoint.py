from common.dependencies import get_current_user, get_db_session
from common.sdoc_status_enum import SDocStatus
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import (
    SourceDocumentStatusDetailed,
    SourceDocumentStatusSimple,
)
from fastapi import APIRouter, Depends, File, UploadFile
from modules.doc_processing.doc_processing_service import DocProcessingService
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/docprocessing",
    dependencies=[Depends(get_current_user)],
    tags=["docprocessing"],
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


@router.get(
    "/project/{proj_id}/status/{status}/detailed",
    response_model=list[SourceDocumentStatusDetailed],
    summary="Get all SourceDocumentStatusDetailed for the Project with the given ID by status",
)
def get_detailed_sdoc_status_by_project_and_status(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    status: SDocStatus,
    authz_user: AuthzUser = Depends(),
) -> list[SourceDocumentStatusDetailed]:
    authz_user.assert_in_project(proj_id)
    return [
        SourceDocumentStatusDetailed.model_validate(sdoc)
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
    uploaded_files: list[UploadFile] = File(
        ...,
        description=(
            "File(s) that get uploaded and represented by the SourceDocument(s)"
        ),
    ),
    authz_user: AuthzUser = Depends(),
) -> int:
    authz_user.assert_in_project(proj_id)
    jobs = DocProcessingService().start_preprocessing(
        project_id=proj_id, uploaded_files=uploaded_files
    )
    return len(jobs)
