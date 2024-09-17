from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.doc_type import DocType
from app.core.data.dto.word_frequency import WordFrequencyCreate, WordFrequencyRead
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.word_frequency import WordFrequencyORM


class CrudWordFrequency(
    CRUDBase[
        WordFrequencyORM,
        WordFrequencyCreate,
        None,
    ]
):
    def read_by_project_and_doctype(
        self, db: Session, *, project_id: int, doctype: DocType
    ) -> List[WordFrequencyRead]:
        wf_orms = (
            db.query(WordFrequencyORM)
            .join(WordFrequencyORM.source_document)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.doctype == doctype,
            )
            .all()
        )
        return [WordFrequencyRead.model_validate(wf) for wf in wf_orms]


crud_word_frequency = CrudWordFrequency(WordFrequencyORM)
