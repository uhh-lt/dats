from typing import List

import srsly
from fastapi.encoders import jsonable_encoder
from modules.analysis.cota.concept_over_time_analysis_crud import crud_cota
from modules.analysis.cota.concept_over_time_analysis_dto import (
    COTASentence,
    COTAUpdateIntern,
)
from modules.analysis.cota.pipeline.cargo import Cargo
from repos.db.sql_repo import SQLService

sqls: SQLService = SQLService()


def store_in_db(cargo: Cargo) -> Cargo:
    # 1. read the required data
    search_space: List[COTASentence] = cargo.data["search_space"]

    # 2. Store search_space in db
    with sqls.db_session() as db:
        search_space_str = srsly.json_dumps(jsonable_encoder(search_space))
        crud_cota.update(
            db=db,
            id=cargo.job.cota.id,
            update_dto=COTAUpdateIntern(search_space=search_space_str),
        )

    return cargo
