import srsly
from fastapi.encoders import jsonable_encoder
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTASentence,
    COTAUpdateIntern,
)
from sqlalchemy.orm import Session


def store_in_db(db: Session, cota_id: int, search_space: list[COTASentence]) -> None:
    search_space_str = srsly.json_dumps(jsonable_encoder(search_space))
    crud_cota.update(
        db=db,
        id=cota_id,
        update_dto=COTAUpdateIntern(search_space=search_space_str),
    )
