from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from modules.word_frequency.word_frequency_dto import (
    WordFrequencyCreate,
    WordFrequencyRead,
)
from modules.word_frequency.word_frequency_orm import WordFrequencyORM
from repos.db.crud_base import CRUDBase, UpdateNotAllowed


class CRUDWordFrequency(
    CRUDBase[
        WordFrequencyORM,
        WordFrequencyCreate,
        UpdateNotAllowed,
    ]
):
    ### READ OPERATIONS ###

    def read_by_project_and_doctype(
        self, db: Session, *, project_id: int, doctype: DocType
    ) -> list[WordFrequencyRead]:
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

    def read_by_project_and_doctype_and_tag(
        self, db: Session, *, project_id: int, doctype: DocType, tag_id: int
    ) -> list[WordFrequencyRead]:
        wf_orms = (
            db.query(WordFrequencyORM)
            .join(WordFrequencyORM.source_document)
            .join(SourceDocumentORM.tags)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.doctype == doctype,
                TagORM.id == tag_id,
            )
            .all()
        )
        return [WordFrequencyRead.model_validate(wf) for wf in wf_orms]

    ### UPDATE OPERATIONS ###

    def update(self, db: Session, *, id: int, update_dto):
        raise NotImplementedError()


crud_word_frequency = CRUDWordFrequency(WordFrequencyORM)
