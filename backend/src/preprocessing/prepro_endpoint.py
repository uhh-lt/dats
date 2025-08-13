from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from common.sdoc_status_enum import SDocStatus
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.project.project_crud import crud_project
from fastapi import APIRouter, Depends
from preprocessing.prepro_dto import PreProProjectStatus
from preprocessing.preprocessing_job_crud import crud_prepro_job
from preprocessing.preprocessing_job_dto import PreprocessingJobRead
from preprocessing.preprocessing_job_payload_crud import crud_prepro_job_payload
from preprocessing.preprocessing_job_payload_dto import PreprocessingJobPayloadRead
from preprocessing.preprocessing_service import PreprocessingService
from sqlalchemy.orm import Session
from systems.job_system.background_job_base_dto import BackgroundJobStatus

router = APIRouter(
    prefix="/prepro", dependencies=[Depends(get_current_user)], tags=["prepro"]
)

pps: PreprocessingService = PreprocessingService()


@router.get(
    "/{prepro_job_id}",
    response_model=PreprocessingJobRead,
    summary="Returns the PreprocessingJob for the given ID if it exists",
)
def get_prepro_job(
    *,
    db: Session = Depends(get_db_session),
    prepro_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> PreprocessingJobRead:
    authz_user.assert_in_same_project_as(Crud.PREPROCESSING_JOB, prepro_job_id)

    db_obj = crud_prepro_job.read(db=db, uuid=prepro_job_id)
    return PreprocessingJobRead.model_validate(db_obj)


@router.patch(
    "/{prepro_job_id}/abort",
    response_model=PreprocessingJobRead,
    summary="Aborts the PreprocessingJob for the given ID if it exists",
)
def abort_prepro_job(
    *, prepro_job_id: str, authz_user: AuthzUser = Depends()
) -> PreprocessingJobRead:
    authz_user.assert_in_same_project_as(Crud.PREPROCESSING_JOB, prepro_job_id)

    return pps.abort_preprocessing_job(ppj_id=prepro_job_id)


@router.get(
    "/project/{project_id}",
    response_model=list[PreprocessingJobRead],
    summary="Returns all PreprocessingJobs for the given project ID if it exists",
)
def get_all_prepro_jobs(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[PreprocessingJobRead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_prepro_job.read_by_proj_id(db=db, proj_id=project_id)
    prepro_jobs = [PreprocessingJobRead.model_validate(db_obj) for db_obj in db_objs]
    prepro_jobs.sort(key=lambda x: x.created, reverse=True)
    return prepro_jobs


@router.get(
    "/project/{proj_id}/status",
    response_model=PreProProjectStatus,
    summary="Returns the PreProProjectStatus of the Project with the given ID.",
)
def get_project_prepro_status(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> PreProProjectStatus:
    authz_user.assert_in_project(proj_id)

    crud_project.exists(db=db, id=proj_id, raise_error=True)

    active_ppj_ids = crud_prepro_job.read_ids_by_proj_id_and_status(
        db=db,
        proj_id=proj_id,
        status=BackgroundJobStatus.RUNNING,
    )

    num_active_prepro_job_payloads = sum(
        [
            len(
                crud_prepro_job_payload.read_ids_by_ppj_id_and_status(
                    db=db, ppj_uuid=active_ppj_id, status=BackgroundJobStatus.RUNNING
                )
            )
            for active_ppj_id in active_ppj_ids
        ]
    )

    erroneous_prepro_job_payloads = []
    ppj_ids = crud_prepro_job.read_ids_by_proj_id(db=db, proj_id=proj_id)
    for ppj_id in ppj_ids:
        payloads = [
            PreprocessingJobPayloadRead.model_validate(db_obj)
            for db_obj in crud_prepro_job_payload.read_by_ppj_id_and_status(
                db=db, ppj_uuid=ppj_id, status=BackgroundJobStatus.ERROR
            )
        ]
        erroneous_prepro_job_payloads.extend(payloads)

    finished_sdocs = crud_sdoc.count_by_project(
        db=db, proj_id=proj_id, status=SDocStatus.finished
    )
    unfinished_sdocs = crud_sdoc.count_by_project(
        db=db, proj_id=proj_id, status=SDocStatus.unfinished_or_erroneous
    )
    total_sdocs = finished_sdocs + unfinished_sdocs

    return PreProProjectStatus(
        project_id=proj_id,
        active_prepro_job_ids=active_ppj_ids,
        num_active_prepro_job_payloads=num_active_prepro_job_payloads,
        erroneous_prepro_job_payload_ids=erroneous_prepro_job_payloads,
        num_sdocs_finished=finished_sdocs,
        num_sdocs_total=total_sdocs,
    )
