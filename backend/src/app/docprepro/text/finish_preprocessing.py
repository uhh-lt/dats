from typing import List

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from loguru import logger


def finish_preprocessing_(pptds: List[PreProTextDoc]) -> None:
    logger.info("Finished preprocessing...")

    if len(pptds) == 0:
        return

    with SQLService().db_session() as db:
        for pptd in pptds:
            # update status
            crud_sdoc.update_status(
                db=db, sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.finished
            )
