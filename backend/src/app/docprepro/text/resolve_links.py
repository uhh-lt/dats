from typing import List

from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.db.sql_service import SQLService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc


def resolve_sdoc_links_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    with SQLService().db_session() as db:
        crud_sdoc_link.resolve_filenames_to_sdoc_ids(db)

    return pptds
