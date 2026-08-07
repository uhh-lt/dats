from sqlalchemy.orm import Session

from core.code.code_orm import CodeORM
from core.tag.tag_orm import TagORM
from modules.classifier.classifier_dto import (
    ClassifierCreate,
    ClassifierEvaluationCreate,
    ClassifierUpdate,
)
from modules.classifier.classifier_orm import ClassifierEvaluationORM, ClassifierORM
from repos.db.crud_base import CRUDBase


class CRUDClassifier(CRUDBase[ClassifierORM, ClassifierCreate, ClassifierUpdate]):
    def create(
        self,
        db: Session,
        *,
        create_dto: ClassifierCreate,
        codes: list[CodeORM],
        tags: list[TagORM],
    ) -> ClassifierORM:
        classifier = super().create(
            db,
            create_dto=create_dto,
        )
        if len(codes) > 0:
            classifier.codes = codes
        if len(tags) > 0:
            classifier.tags = tags
        db.flush()
        db.refresh(classifier)
        return classifier

    def add_evaluation(
        self, db: Session, create_dto: ClassifierEvaluationCreate
    ) -> ClassifierORM:
        classifier = self.read(db=db, id=create_dto.classifier_id)
        classifier.evaluations.append(
            ClassifierEvaluationORM(**create_dto.model_dump())
        )
        db.add(classifier)
        db.flush()
        db.refresh(classifier)
        return classifier


crud_classifier = CRUDClassifier(ClassifierORM)
