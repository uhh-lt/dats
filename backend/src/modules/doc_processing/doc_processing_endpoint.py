from datetime import datetime

from common.dependencies import get_current_user, get_db_session
from common.sdoc_status_enum import SDocStatus
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentStatusRead
from fastapi import APIRouter, Depends, File, UploadFile
from modules.doc_processing.doc_processing_service import DocProcessingService
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/docprocessing",
    dependencies=[Depends(get_current_user)],
    tags=["docprocessing"],
)


@router.get(
    "/project/{proj_id}/status/{status}",
    response_model=list[SourceDocumentStatusRead],
    summary="Get all SourceDocumentStatus for the Project with the given ID by status",
)
def get_sdoc_status_by_project_and_status(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    status: SDocStatus,
    authz_user: AuthzUser = Depends(),
) -> list[SourceDocumentStatusRead]:
    authz_user.assert_in_project(proj_id)
    return [
        SourceDocumentStatusRead.model_validate(sdoc)
        for sdoc in crud_sdoc.read_by_project_and_status(
            db=db, project_id=proj_id, status=status
        )
    ]


@router.put(
    "/project/{proj_id}",
    response_model=datetime,
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
) -> datetime:
    authz_user.assert_in_project(proj_id)
    ppsn = DocProcessingService()
    job = ppsn.start_preprocessing(project_id=proj_id, uploaded_files=uploaded_files)
    return job.get_created()
