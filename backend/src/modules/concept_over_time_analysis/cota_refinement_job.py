from common.job_type import JobType
from modules.concept_over_time_analysis.cota_crud import crud_cota
from modules.concept_over_time_analysis.cota_dto import COTARead, COTARefinementJobInput
from modules.concept_over_time_analysis.refinement_steps.finetune_apply_compute import (
    finetune_apply_compute,
)
from modules.concept_over_time_analysis.refinement_steps.init_search_space import (
    init_search_space,
)
from modules.concept_over_time_analysis.refinement_steps.store_in_db import store_in_db
from systems.job_system.job_dto import Job, JobResultTTL
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type=JobType.COTA_REFINEMENT,
    input_type=COTARefinementJobInput,
    output_type=None,
    device="gpu",
    result_ttl=JobResultTTL.NINETY_DAYS,
)
def cota_refinement(payload: COTARefinementJobInput, job: Job) -> None:
    from repos.db.sql_repo import SQLRepo

    # init steps / current_step
    job.update(
        steps=[
            "Initialize search space",
            "Finetune and apply compute",
            "Store in DB",
        ],
        current_step=0,
    )

    with SQLRepo().db_session() as db:
        # make sure the cota exists!
        db_obj = crud_cota.read(db=db, id=payload.cota_id)
        cota = COTARead.model_validate(db_obj)

        # make sure there is at least one concept
        if len(cota.concepts) < 2:
            raise ValueError("At least two concepts are required for refinement!")

        # Do the refinement in 3 steps:
        search_space = init_search_space(db=db, cota=cota)

        job.update(current_step=1)
        search_space = finetune_apply_compute(cota=cota, search_space=search_space)

        job.update(current_step=1)
        store_in_db(db=db, cota_id=cota.id, search_space=search_space)
