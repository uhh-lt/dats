from fastapi import File, Form, HTTPException, UploadFile

from common.dependencies import DBSession
from common.doc_type_enum import DocType
from common.project_router import project_router
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc_processing.doc_processing_dto import (
    SdocHealthColumn,
    SdocHealthResult,
    SdocHealthSort,
    SourceDocumentStatusSimple,
)
from core.doc_processing.doc_processing_service import DocProcessingService
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)

router = project_router("/doc-processing", tags=["docprocessing"])


# --- read operations


@router.get(
    "/columns",
    response_model=list[SdocHealthColumn],
    summary="Get all columns (the pipeline steps) for the given document type, with whether each is a core step",
)
def get_search_columns_by_doctype(
    *,
    project_id: int,
    doctype: DocType,
) -> list[SdocHealthColumn]:
    return DocProcessingService().read_health_columns(doctype=doctype)


@router.post(
    "/search",
    response_model=SdocHealthResult,
    summary="Get all SourceDocumentStatusDetailed for the Project with the given ID by status",
)
def search_sdoc_health(
    *,
    db: DBSession,
    project_id: int,
    doctype: DocType,
    sorts: list[SdocHealthSort],
    page: int,
    page_size: int,
) -> SdocHealthResult:
    return DocProcessingService().search_sdoc_health(
        db=db,
        project_id=project_id,
        doctype=doctype,
        sorts=sorts,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/status",
    response_model=list[SourceDocumentStatusSimple],
    summary="Get all SourceDocumentStatusSimple for the Project with the given ID by status",
)
def get_simple_sdoc_status_by_project_and_status(
    *,
    db: DBSession,
    project_id: int,
    status: SDocStatus,
) -> list[SourceDocumentStatusSimple]:
    sdocs = crud_sdoc.read_by_project_and_status(
        db=db, project_id=project_id, status=status
    )
    step_status = crud_sdoc_step_status.read_by_sdocs(
        db=db, project_id=project_id, sdoc_ids=[sdoc.id for sdoc in sdocs]
    )
    return [
        SourceDocumentStatusSimple.from_sdoc_orm(sdoc, step_status[sdoc.id])
        for sdoc in sdocs
    ]


# --- job operations


@router.post(
    "/upload",
    response_model=int,
    summary="Uploads one or multiple files to the Project with the given ID if it exists",
)
def upload_files(
    *,
    db: DBSession,
    project_id: int,
    settings: str = Form(..., description="ProcessingSettings as JSON string"),
    uploaded_files: list[UploadFile] = File(
        ...,
        description=(
            "File(s) that get uploaded and represented by the SourceDocument(s)"
        ),
    ),
) -> int:
    try:
        settings_obj = ProcessingSettings.model_validate_json(settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings: {e}")
    jobs = DocProcessingService().start_preprocessing(
        db=db,
        project_id=project_id,
        uploaded_files=uploaded_files,
        settings=settings_obj,
    )
    return len(jobs)


@router.post(
    "/retry",
    response_model=str,
    summary="Retries doc processing jobs for SourceDocuments in the given Project and document type",
)
def retry_failed_sdocs(
    *,
    project_id: int,
    doctype: DocType,
    sdoc_ids: list[int],
) -> str:
    return DocProcessingService().retry_jobs(
        project_id=project_id,
        doctype=doctype,
        sdoc_ids=sdoc_ids,
    )


@router.post(
    "/recompute",
    response_model=int,
    summary="Recomputes the processing step for all SourceDocuments in the Project",
)
def recompute_processing_step(
    *,
    db: DBSession,
    project_id: int,
    processing_step: str,
    sdoc_ids: list[int],
    settings: ProcessingSettings,
) -> int:
    jobs = DocProcessingService().recompute_processing_step(
        db=db,
        project_id=project_id,
        sdoc_ids=sdoc_ids,
        processing_step=processing_step,
        settings=settings,
    )
    return len(jobs)
