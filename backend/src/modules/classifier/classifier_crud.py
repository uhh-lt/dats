from sqlalchemy import func
from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from modules.classifier.classifier_dto import (
    ClassifierCreate,
    ClassifierDataset,
    ClassifierEvaluationCreate,
    ClassifierModel,
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
        manual_commit: bool = False,
    ) -> ClassifierORM:
        classifier = super().create(
            db, create_dto=create_dto, manual_commit=manual_commit
        )
        if len(codes) > 0:
            classifier.codes = codes
        if len(tags) > 0:
            classifier.tags = tags
        if manual_commit:
            db.flush()
        else:
            db.commit()
        db.refresh(classifier)
        return classifier

    def read_dataset(
        self,
        db: Session,
        model: ClassifierModel,
        sdoc_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
    ) -> list[ClassifierDataset]:
        match model:
            case ClassifierModel.DOCUMENT:
                results = (
                    db.query(
                        TagORM.id.label("class_id"),
                        func.array_agg(SourceDocumentORM.id).label("data_ids"),
                        func.count(SourceDocumentORM.id).label("num_examples"),
                    )
                    .join(SourceDocumentORM.tags)
                    .filter(
                        SourceDocumentORM.id.in_(sdoc_ids),
                        TagORM.id.in_(class_ids),
                    )
                    .group_by(TagORM.id)
                    .all()
                )
            case ClassifierModel.SENTENCE:
                results = (
                    db.query(
                        CodeORM.id.label("class_id"),
                        func.array_agg(SentenceAnnotationORM.id).label("data_ids"),
                        func.count(SentenceAnnotationORM.id).label("num_examples"),
                    )
                    .join(SentenceAnnotationORM.code)
                    .join(SentenceAnnotationORM.annotation_document)
                    .filter(
                        AnnotationDocumentORM.user_id.in_(user_ids),
                        AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                        CodeORM.id.in_(class_ids),
                    )
                    .group_by(CodeORM.id)
                    .all()
                )
            case ClassifierModel.SPAN:
                results = (
                    db.query(
                        CodeORM.id.label("class_id"),
                        func.array_agg(SpanAnnotationORM.id).label("data_ids"),
                        func.count(SpanAnnotationORM.id).label("num_examples"),
                    )
                    .join(SpanAnnotationORM.code)
                    .join(SpanAnnotationORM.annotation_document)
                    .filter(
                        AnnotationDocumentORM.user_id.in_(user_ids),
                        AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                        CodeORM.id.in_(class_ids),
                    )
                    .group_by(CodeORM.id)
                    .all()
                )

        return [
            ClassifierDataset(
                class_id=row.class_id,
                num_examples=row.num_examples,
                data_ids=row.data_ids,
            )
            for row in results
        ]

    def add_evaluation(
        self, db: Session, create_dto: ClassifierEvaluationCreate
    ) -> ClassifierORM:
        classifier = self.read(db=db, id=create_dto.classifier_id)
        classifier.evaluations.append(
            ClassifierEvaluationORM(**create_dto.model_dump())
        )
        db.add(classifier)
        db.commit()
        db.refresh(classifier)
        return classifier


crud_classifier = CRUDClassifier(ClassifierORM)
