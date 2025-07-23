from typing import List, Optional

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.analysis.cota.concept_over_time_analysis_crud import crud_cota
from modules.analysis.cota.concept_over_time_analysis_dto import (
    COTACreate,
    COTACreateIntern,
    COTARead,
    COTARefinementHyperparameters,
    COTARefinementJobRead,
    COTASentenceID,
    COTAUpdate,
)
from modules.analysis.cota.service import COTAService
from repos.redis_repo import RedisService
from sqlalchemy.orm import Session

cotas: COTAService = COTAService()
redis: RedisService = RedisService()

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
        cota_create=COTACreateIntern(
            name=cota.name,
            project_id=cota.project_id,
            user_id=authz_user.user.id,
        ),
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

    cota = cotas.read_by_id(db=db, cota_id=cota_id)
    return cota


@router.get(
    "/{project_id}/user",
    response_model=List[COTARead],
    summary="Returns COTAs of the Project of the User",
    description="Returns the COTA of the Project with the given ID and the logged-in User if it exists",
)
async def get_by_project_and_user(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[COTARead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_cota.read_by_project_and_user(
        db=db, project_id=project_id, user_id=authz_user.user.id, raise_error=False
    )
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

    db_obj = crud_cota.duplicate_by_id(
        db=db, cota_id=cota_id, user_id=authz_user.user.id
    )
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
    cota_sentence_ids: List[COTASentenceID],
    concept_id: Optional[str] = None,
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
    cota_sentence_ids: List[COTASentenceID],
    authz_user: AuthzUser = Depends(),
) -> COTARead:  # noqa: F821
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return cotas.remove_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
    )


@router.post(
    "/refine/{cota_id}",
    response_model=COTARefinementJobRead,
    summary="Refines the ConceptOverTimeAnalysis",
    description="Refines the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def refine_cota_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    hyperparams: Optional[COTARefinementHyperparameters] = None,
    authz_user: AuthzUser = Depends(),
) -> COTARefinementJobRead:  # noqa: F821
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return cotas.create_and_start_refinement_job_async(
        db=db,
        cota_id=cota_id,
        hyperparams=hyperparams,
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

    return cotas.delete_by_id(db=db, cota_id=cota_id)


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
    cota_job = redis.load_cota_job(cota_job_id)

    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_job.cota.id)

    return cota_job


@router.get(
    "/refine/most_recent/{cota_id}",
    response_model=Optional[COTARefinementJobRead],
    summary="Returns the most recent COTA Refinement Job for the given COTA ID",
    description="Returns the most recent COTA Refinement Job for the given COTA ID",
)
async def get_most_recent_cota_job(
    *,
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> Optional[COTARefinementJobRead]:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    return redis.get_most_recent_cota_job_by_cota_id(cota_id=cota_id)


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
