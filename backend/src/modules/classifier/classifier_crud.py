from sqlalchemy import func, literal
from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
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

    def read_dataset(
        self,
        db: Session,
        model: ClassifierModel,
        sdoc_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        merge_children_into_parent: bool = False,
    ) -> list[ClassifierDataset]:
        match model:
            case ClassifierModel.DOCUMENT:
                results = (
                    db.query(
                        TagORM.id.label("class_id"),
                        func.array_agg(SourceDocumentORM.id).label("data_ids"),
                        func.count(SourceDocumentORM.id).label("num_examples"),
                    )
                    .filter(
                        SourceDocumentORM.id.in_(sdoc_ids),
                        SourceDocumentORM.tags.any(TagORM.id.in_(class_ids)),
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
                if merge_children_into_parent:
                    codes = [
                        [
                            code.id
                            for code in crud_code.read_with_children(db, code_id=id)
                        ]
                        for id in class_ids
                    ]
                else:
                    codes = [class_ids]
                results = []
                for parent, child_codes in zip(class_ids, codes):
                    result = (
                        db.query(
                            CodeORM.project_id,
                            literal(parent).label("class_id")
                            if merge_children_into_parent
                            else CodeORM.id.label("class_id"),
                            func.array_agg(SpanAnnotationORM.id).label("data_ids"),
                            func.count(
                                func.distinct(
                                    func.row_(
                                        SpanAnnotationORM.annotation_document_id,
                                        SpanAnnotationORM.begin,
                                        SpanAnnotationORM.end,
                                    )
                                )
                            ).label("num_examples")
                            if merge_children_into_parent
                            else func.count(SpanAnnotationORM.id).label("num_examples"),
                        )
                        .join(SpanAnnotationORM.code)
                        .join(SpanAnnotationORM.annotation_document)
                        .filter(
                            AnnotationDocumentORM.user_id.in_(user_ids),
                            AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                            CodeORM.id.in_(child_codes),
                        )
                        .group_by(
                            CodeORM.project_id
                            if merge_children_into_parent
                            else CodeORM.id
                        )
                        .all()
                    )
                    results.extend(result)
        return [
            ClassifierDataset(
                class_id=row.class_id,
                num_examples=row.num_examples,
                data_ids=row.data_ids,
            )
            for row in results
        ]

    def read_dataset2(
        self,
        db: Session,
        model: ClassifierModel,
        tag_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        merge_children_into_parent: bool = False,
    ) -> list[ClassifierDataset]:
        results = (
            db.query(SourceDocumentORM.id)
            .filter(SourceDocumentORM.tags.any(TagORM.id.in_(tag_ids)))
            .all()
        )
        sdoc_ids = [row._tuple()[0] for row in results]

        return self.read_dataset(
            db=db,
            model=model,
            sdoc_ids=sdoc_ids,
            user_ids=user_ids,
            class_ids=class_ids,
            merge_children_into_parent=merge_children_into_parent,
        )

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
