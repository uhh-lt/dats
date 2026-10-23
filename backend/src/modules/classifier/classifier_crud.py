from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from modules.classifier.classifier_dto import (
    ClassifierCreate,
    ClassifierEvaluationCreate,
    ClassifierUpdate,
)
from modules.classifier.classifier_orm import (
    ClassifierCodeLinkTable,
    ClassifierEvaluationORM,
    ClassifierORM,
    ClassifierTagLinkTable,
)
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDClassifier(SQLCRUDBase[ClassifierORM, ClassifierCreate, ClassifierUpdate]):
    ### CREATE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### OTHER OPERATIONS ###

    def add_evaluation(
        self, db: Session, *, create_dto: ClassifierEvaluationCreate
    ) -> ClassifierORM:
        classifier = self.read(db=db, id=create_dto.classifier_id)
        classifier.evaluations.append(
            ClassifierEvaluationORM(**create_dto.model_dump())
        )
        db.add(classifier)
        db.flush()
        db.refresh(classifier)
        return classifier

    def link_codes(self, db: Session, *, id: int, code_ids: list[int]) -> ClassifierORM:
        """Link codes to a classifier; already linked codes are skipped."""
        return self._link(
            db=db,
            id=id,
            link_table=ClassifierCodeLinkTable,
            key="code_id",
            ids=code_ids,
        )

    def link_tags(self, db: Session, *, id: int, tag_ids: list[int]) -> ClassifierORM:
        """Link tags to a classifier; already linked tags are skipped."""
        return self._link(
            db=db, id=id, link_table=ClassifierTagLinkTable, key="tag_id", ids=tag_ids
        )

    def _link(
        self,
        db: Session,
        *,
        id: int,
        link_table: type[ClassifierCodeLinkTable] | type[ClassifierTagLinkTable],
        key: str,
        ids: list[int],
    ) -> ClassifierORM:
        classifier = self.read(db=db, id=id)
        if not ids:
            return classifier

        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db.execute(
                insert(link_table).on_conflict_do_nothing(),
                [{"classifier_id": id, key: link_id} for link_id in batch_ids],
            )
        db.flush()

        # the loaded relationships do not know the new links yet
        db.expire(classifier, ["codes", "tags"])
        return classifier


crud_classifier = CRUDClassifier(ClassifierORM)
