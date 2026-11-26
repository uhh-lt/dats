from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.artefacts.word_frequencies.word_frequency_dto import WordFrequencyCreate
from core.artefacts.word_frequencies.word_frequency_orm import WordFrequencyORM
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import SQLCRUDBase, UpdateNotAllowed


class CRUDWordFrequency(
    SQLCRUDBase[
        WordFrequencyORM,
        WordFrequencyCreate,
        UpdateNotAllowed,
        tuple[int, int, str],  # (project_id, sdoc_id, word)
    ]
):
    ### READ OPERATIONS ###

    def read_by_sdoc(
        self, db: Session, *, project_id: int, sdoc_id: int
    ) -> list[WordFrequencyORM]:
        """
        Read the word frequencies of a document of the project.

        Args:
            project_id: The project of the document.
            sdoc_id: The document.

        Returns:
            The word frequencies of the document, none for a document of another
            project.
        """
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id, self.model.sdoc_id == sdoc_id)
            .all()
        )

    def read_by_project_and_doctype(
        self, db: Session, *, project_id: int, doctype: DocType
    ) -> list[WordFrequencyORM]:
        return (
            db.query(WordFrequencyORM)
            .join(WordFrequencyORM.source_document)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.doctype == doctype,
            )
            .all()
        )

    def read_by_project_and_doctype_and_tag(
        self, db: Session, *, project_id: int, doctype: DocType, tag_id: int
    ) -> list[WordFrequencyORM]:
        return (
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

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[tuple[int, int, str]],
        update_dtos: list[UpdateNotAllowed],
    ) -> list[WordFrequencyORM]:
        raise NotImplementedError()

    ### DELETE OPERATIONS ###

    def delete_by_sdoc_id(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
    ) -> None:
        """
        Delete the word frequencies of a document.

        Args:
            project_id: The project of the document.
            sdoc_id: The document.
        """
        db.query(self.model).filter(
            self.model.project_id == project_id, self.model.sdoc_id == sdoc_id
        ).delete()
        db.flush()


crud_word_frequency = CRUDWordFrequency(WordFrequencyORM)
