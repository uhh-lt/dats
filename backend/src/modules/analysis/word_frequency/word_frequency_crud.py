from typing import List

from common.doc_type import DocType
from core.doc.source_document_orm import SourceDocumentORM
from modules.analysis.word_frequency.word_frequency_dto import (
    WordFrequencyCreate,
    WordFrequencyRead,
)
from modules.analysis.word_frequency.word_frequency_orm import WordFrequencyORM
from repos.db.crud_base import CRUDBase, UpdateNotAllowed
from sqlalchemy.orm import Session


class CrudWordFrequency(
    CRUDBase[
        WordFrequencyORM,
        WordFrequencyCreate,
        UpdateNotAllowed,
    ]
):
    def update(self, db: Session, *, id: int, update_dto):
        raise NotImplementedError()

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
