import srsly
from fastapi.encoders import jsonable_encoder

from common.job_type import JobType
from modules.concept_over_time_analysis.cota_crud import crud_cota
from modules.concept_over_time_analysis.cota_dto import (
    COTARead,
    COTARefinementJobInput,
    COTAUpdateIntern,
)
from modules.concept_over_time_analysis.refinement_steps.finetune_apply_compute import (
    finetune_apply_compute,
)
from modules.concept_over_time_analysis.refinement_steps.init_search_space import (
    init_search_space,
)
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, JobResultTTL
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type=JobType.COTA_REFINEMENT,
    input_type=COTARefinementJobInput,
    output_type=None,
    device="gpu",
    result_ttl=JobResultTTL.NINETY_DAYS,
)
def cota_refinement(payload: COTARefinementJobInput, job: Job) -> None:
    # init steps / current_step
    job.update(
        steps=[
            "Initialize search space",
            "Finetune, apply, compute",
            "Store in DB",
        ],
        current_step=0,
    )

    with sqlr.db_session() as db:
        # Make sure the cota exists!
        db_obj = crud_cota.read(db=db, id=payload.cota_id)
        cota = COTARead.model_validate(db_obj)

        # Make sure there are at least two concepts
        if len(cota.concepts) < 2:
            raise ValueError("At least two concepts are required for refinement!")

        # Do the refinement in 3 steps:
        # 1. init search space
        search_space = init_search_space(db=db, cota=cota)

        # 2. finetune, apply, compute
        job.update(current_step=1)
        search_space = finetune_apply_compute(
            device_str=job.get_device(), cota=cota, search_space=search_space
        )

        # 3. store in db
        job.update(current_step=2)
        search_space_str = srsly.json_dumps(jsonable_encoder(search_space))
        crud_cota.update(
            db=db,
            id=cota.id,
            update_dto=COTAUpdateIntern(search_space=search_space_str),
        )
