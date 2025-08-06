from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTACreate,
    COTACreateIntern,
    COTARead,
    COTARefinementJobInput,
    COTARefinementJobRead,
    COTASentenceID,
    COTAUpdate,
)
from modules.concept_over_time_analysis.cota_service import COTAService
from sqlalchemy.orm import Session
from systems.job_system.job_service import JobService

cotas = COTAService()
js = JobService()

router = APIRouter(
    prefix="/cota",
    dependencies=[Depends(get_current_user)],
    tags=["conceptOverTimeAnalysis"],
)


@router.put(
    "",
    response_model=COTARead,
    summary="Creates an ConceptOverTimeAnalysis",
    description="Creates an ConceptOverTimeAnalysis",
)
async def create(
    *,
    db: Session = Depends(get_db_session),
    cota: COTACreate,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_project(cota.project_id)

    return cotas.create(
        db=db,
        cota_create=COTACreateIntern(name=cota.name, project_id=cota.project_id),
    )


@router.get(
    "/{cota_id}",
    response_model=COTARead,
    summary="Returns the ConceptOverTimeAnalysis",
    description="Returns the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    db_obj = crud_cota.read(db=db, id=cota_id)
    return COTARead.model_validate(db_obj)


@router.get(
    "/project/{project_id}",
    response_model=list[COTARead],
    summary="Returns COTAs of the Project",
    description="Returns the COTA of the Project with the given ID if it exists",
)
async def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[COTARead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_cota.read_by_project(db=db, project_id=project_id)
    return [COTARead.model_validate(db_obj) for db_obj in db_objs]


@router.patch(
    "/{cota_id}",
    response_model=COTARead,
    summary="Updates the ConceptOverTimeAnalysis",
    description="Updates the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_upate: COTAUpdate,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return cotas.update(
        db=db,
        cota_id=cota_id,
        cota_update=cota_upate,
    )


@router.post(
    "/duplicate/{cota_id}",
    response_model=COTARead,
    summary="Duplicates the ConceptOverTimeAnalysis with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    db_obj = crud_cota.duplicate_by_id(db=db, cota_id=cota_id)
    return COTARead.model_validate(db_obj)


@router.post(
    "/annotate/{cota_id}",
    response_model=COTARead,
    summary="Annotate (multiple) COTASentences",
)
async def annotate_cota_sentence(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_sentence_ids: list[COTASentenceID],
    concept_id: str | None = None,
    authz_user: AuthzUser = Depends(),
) -> COTARead:  # noqa: F821
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return cotas.annotate_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
        concept_id=concept_id,
    )


@router.post(
    "/remove/{cota_id}",
    response_model=COTARead,
    summary="Remove (multiple) COTASentences from the search space",
)
async def remove_cota_sentence(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_sentence_ids: list[COTASentenceID],
    authz_user: AuthzUser = Depends(),
) -> COTARead:  # noqa: F821
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return cotas.remove_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
    )


@router.delete(
    "/{cota_id}",
    response_model=COTARead,
    summary="Removes the ConceptOverTimeAnalysis",
    description="Removes the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    db_obj = crud_cota.delete(db=db, id=cota_id)
    return COTARead.model_validate(db_obj)


@router.post(
    "/reset/{cota_id}",
    response_model=COTARead,
    summary="Resets the ConceptOverTimeAnalysis",
    description="Resets the ConceptOverTimeAnalysis deleting model, embeddings, refinement jobs and resetting the search space",
)
async def reset_cota(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return cotas.reset(
        db=db,
        cota_id=cota_id,
    )


@router.post(
    "/refine",
    response_model=COTARead,
    summary="Refines the ConceptOverTimeAnalysis",
    description="Refines the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def refine_cota(
    *,
    db: Session = Depends(get_db_session),
    payload: COTARefinementJobInput,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, payload.cota_id)
    cota_orm = cotas.start_refinement_job(db=db, payload=payload)
    return COTARead.model_validate(cota_orm)


@router.get(
    "/refine/{cota_job_id}",
    response_model=COTARefinementJobRead,
    summary="Returns the COTA Refinement Job for the given ID",
    description="Returns the COTA Refinement Job for the given ID if it exists",
)
async def get_cota_job(
    *,
    cota_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> COTARefinementJobRead:
    job = js.get_job(job_id=cota_job_id)
    authz_user.assert_in_project(job.meta["project_id"])
    return COTARefinementJobRead.from_rq_job(job=job)
