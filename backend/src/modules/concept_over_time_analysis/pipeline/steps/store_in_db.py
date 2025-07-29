import srsly
from fastapi.encoders import jsonable_encoder
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTASentence,
    COTAUpdateIntern,
)
from modules.concept_over_time_analysis.pipeline.cargo import Cargo
from repos.db.sql_repo import SQLRepo

sqlr: SQLRepo = SQLRepo()


def store_in_db(cargo: Cargo) -> Cargo:
    # 1. read the required data
    search_space: list[COTASentence] = cargo.data["search_space"]

    # 2. Store search_space in db
    with sqlr.db_session() as db:
        search_space_str = srsly.json_dumps(jsonable_encoder(search_space))
        crud_cota.update(
            db=db,
            id=cargo.job.cota.id,
            update_dto=COTAUpdateIntern(search_space=search_space_str),
        )

    return cargo
