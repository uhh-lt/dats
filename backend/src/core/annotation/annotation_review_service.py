from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.annotation_review_dto import (
    AnnotationReviewAction,
    AnnotationReviewItem,
    AnnotationReviewType,
)
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationRead, BBoxAnnotationUpdate
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
)
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationRead, SpanAnnotationUpdate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.code.code_service import InvalidCodeTreeError, code_service
from repos.db.crud_base import NoSuchElementError


class AnnotationReviewService:
    _models = {
        AnnotationReviewType.SPAN: SpanAnnotationORM,
        AnnotationReviewType.SENTENCE: SentenceAnnotationORM,
        AnnotationReviewType.BBOX: BBoxAnnotationORM,
    }
    _read_dtos = {
        AnnotationReviewType.SPAN: SpanAnnotationRead,
        AnnotationReviewType.SENTENCE: SentenceAnnotationRead,
        AnnotationReviewType.BBOX: BBoxAnnotationRead,
    }

    def list_reviews(
        self,
        db: Session,
        *,
        project_id: int,
        annotation_type: AnnotationReviewType,
        page: int,
        page_size: int,
        user_id: int | None = None,
        branch_id: int | None = None,
        code_id: int | None = None,
    ) -> tuple[int, list[AnnotationReviewItem]]:
        model = self._models[annotation_type]
        current_by_concept, review_code_ids = self._review_context(
            db, project_id=project_id, branch_id=branch_id
        )
        query = db.query(model).filter(
            model.project_id == project_id,
            model.code_id.in_(review_code_ids),
        )
        if user_id is not None:
            query = query.join(model.annotation_document).filter(
                AnnotationDocumentORM.user_id == user_id
            )
        if code_id is not None:
            code = db.query(CodeORM).filter(CodeORM.id == code_id).first()
            if code is None or code.project_id != project_id:
                raise InvalidCodeTreeError("Code snapshot belongs to another project")
            query = query.filter(model.code_id == code_id)
        total = query.count()
        annotations = (
            query.order_by(model.updated.desc(), model.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return total, [
            self._to_item(
                annotation_type=annotation_type,
                annotation=annotation,
                current_by_concept=current_by_concept,
            )
            for annotation in annotations
        ]

    def counts(
        self,
        db: Session,
        *,
        project_id: int,
        branch_id: int | None = None,
        code_id: int | None = None,
    ) -> dict[str, int]:
        _, review_code_ids = self._review_context(
            db, project_id=project_id, branch_id=branch_id
        )
        if code_id is not None:
            code = db.query(CodeORM).filter(CodeORM.id == code_id).first()
            if code is None or code.project_id != project_id:
                raise InvalidCodeTreeError("Code snapshot belongs to another project")
            review_code_ids = [code_id] if code_id in review_code_ids else []
        return {
            annotation_type.value: db.query(model)
            .filter(
                model.project_id == project_id,
                model.code_id.in_(review_code_ids),
            )
            .count()
            for annotation_type, model in self._models.items()
        }

    def resolve(
        self,
        db: Session,
        *,
        project_id: int,
        annotation_type: AnnotationReviewType,
        annotation_id: int,
        action: AnnotationReviewAction,
        replacement_code_id: int | None,
        branch_id: int | None = None,
    ) -> AnnotationReviewItem | None:
        model = self._models[annotation_type]
        annotation = db.query(model).filter(model.id == annotation_id).first()
        if annotation is None:
            raise NoSuchElementError(model, id=annotation_id)
        if annotation.project_id != project_id:
            raise InvalidCodeTreeError("Annotation belongs to another project")

        current_by_concept, review_code_ids = self._review_context(
            db, project_id=project_id, branch_id=branch_id
        )
        if annotation.code_id not in review_code_ids:
            raise InvalidCodeTreeError("Annotation does not require review")
        current = current_by_concept.get(annotation.code.concept_id)

        if action == AnnotationReviewAction.DELETE:
            self._delete(
                db, annotation_type=annotation_type, annotation_id=annotation_id
            )
            return None
        if action == AnnotationReviewAction.UPDATE_CURRENT:
            if current is None or current.is_deleted:
                raise InvalidCodeTreeError(
                    "The assigned concept has no current Code in this codebook"
                )
            annotation.code = current
        elif action == AnnotationReviewAction.REASSIGN:
            if replacement_code_id is None:
                raise InvalidCodeTreeError("A replacement Code is required")
            visible_by_concept = code_service.read_visible_map(
                db, project_id=project_id, branch_id=branch_id
            )
            replacement = next(
                (
                    code
                    for code in visible_by_concept.values()
                    if code.id == replacement_code_id
                ),
                None,
            )
            if replacement is None:
                raise InvalidCodeTreeError(
                    "Replacement must be visible in the selected codebook"
                )
            annotation.code = replacement
        db.add(annotation)
        db.flush()
        return self._to_item(
            annotation_type=annotation_type,
            annotation=annotation,
            current_by_concept=current_by_concept,
        )

    def resolve_bulk(
        self,
        db: Session,
        *,
        project_id: int,
        source_code_id: int,
        action: AnnotationReviewAction,
        replacement_code_id: int | None,
        branch_id: int | None = None,
    ) -> dict[str, int]:
        source = db.query(CodeORM).filter(CodeORM.id == source_code_id).first()
        if source is None or source.project_id != project_id:
            raise InvalidCodeTreeError(
                "Source Code snapshot belongs to another project"
            )

        current_by_concept, review_code_ids = self._review_context(
            db, project_id=project_id, branch_id=branch_id
        )
        if source.id not in review_code_ids:
            raise InvalidCodeTreeError("Source Code does not require review")
        current = current_by_concept.get(source.concept_id)

        target: CodeORM | None = None
        if action == AnnotationReviewAction.UPDATE_CURRENT:
            if current is None or current.is_deleted:
                raise InvalidCodeTreeError(
                    "The assigned concept has no current Code in this codebook"
                )
            target = current
        elif action == AnnotationReviewAction.REASSIGN:
            if replacement_code_id is None:
                raise InvalidCodeTreeError("A replacement Code is required")
            visible_by_concept = code_service.read_visible_map(
                db, project_id=project_id, branch_id=branch_id
            )
            target = next(
                (
                    code
                    for code in visible_by_concept.values()
                    if code.id == replacement_code_id
                ),
                None,
            )
            if target is None:
                raise InvalidCodeTreeError(
                    "Replacement must be visible in the selected codebook"
                )

        annotations_by_type = {
            AnnotationReviewType.SPAN: db.query(SpanAnnotationORM)
            .filter(SpanAnnotationORM.code_id == source_code_id)
            .all(),
            AnnotationReviewType.SENTENCE: db.query(SentenceAnnotationORM)
            .filter(SentenceAnnotationORM.code_id == source_code_id)
            .all(),
            AnnotationReviewType.BBOX: db.query(BBoxAnnotationORM)
            .filter(BBoxAnnotationORM.code_id == source_code_id)
            .all(),
        }
        counts = {
            annotation_type.value: len(annotations)
            for annotation_type, annotations in annotations_by_type.items()
        }

        for annotation_type, annotations in annotations_by_type.items():
            for annotation in annotations:
                if action == AnnotationReviewAction.DELETE:
                    self._delete(
                        db,
                        annotation_type=annotation_type,
                        annotation_id=annotation.id,
                    )
                elif annotation_type == AnnotationReviewType.SPAN:
                    if target is None:
                        raise InvalidCodeTreeError("A target Code is required")
                    crud_span_anno.update(
                        db,
                        id=annotation.id,
                        update_dto=SpanAnnotationUpdate(code_id=target.id),
                    )
                elif annotation_type == AnnotationReviewType.SENTENCE:
                    if target is None:
                        raise InvalidCodeTreeError("A target Code is required")
                    crud_sentence_anno.update(
                        db,
                        id=annotation.id,
                        update_dto=SentenceAnnotationUpdate(code_id=target.id),
                    )
                else:
                    if target is None:
                        raise InvalidCodeTreeError("A target Code is required")
                    crud_bbox_anno.update(
                        db,
                        id=annotation.id,
                        update_dto=BBoxAnnotationUpdate(code_id=target.id),
                    )

        return counts

    def _review_context(
        self, db: Session, *, project_id: int, branch_id: int | None
    ) -> tuple[dict[UUID, CodeORM], list[int]]:
        """Resolve the selected codebook and the snapshots requiring review.

        Review is always evaluated in the context of the codebook currently being
        viewed, not in the annotation snapshot's original branch in isolation.
        ``branch_id=None`` selects Main. A non-null ``branch_id`` selects the usual
        branch overlay: active branch snapshots override active Main snapshots with
        the same ``concept_id``, while unchanged concepts fall back to Main.

        A Code snapshot requires review if and only if BOTH rules below are true:

        1. Its ``id`` differs from the snapshot currently visible for its
           ``concept_id`` in the selected Main/branch overlay. A missing or
           tombstoned visible concept also counts as a mismatch.
        2. Its origin is relevant to the selected codebook: the snapshot has
           ``branch_id=None`` (it originated in Main), or its ``branch_id`` equals
           the selected ``branch_id``. Snapshots originating in any other branch
           are excluded from this review context.

        In formula form, for an annotation's assigned snapshot ``s`` and selected
        branch ``b``::

            visible = selected_overlay[b].get(s.concept_id)
            origin_is_relevant = s.branch_id is None or s.branch_id == b
            needs_review = origin_is_relevant and (
                visible is None or visible.id != s.id
            )

        Examples:
        - While viewing Main, an old Main snapshot requires review, but a snapshot
          from any branch does not.
        - While viewing branch B, a Main annotation requires review when B overrides
          its concept with a different snapshot.
        - While viewing branch B, a current Main annotation does not require review
          when B has no override for that concept.
        - While viewing branch B, an old B snapshot requires review, while snapshots
          originating in branch C are excluded.

        The returned mapping includes tombstones so callers can distinguish an
        intentionally deleted current concept from a concept with no history. Read
        DTOs still expose such a current Code as ``None``, because annotations cannot
        be reassigned to tombstones.
        """
        current_by_concept = code_service.read_visible_map(
            db,
            project_id=project_id,
            branch_id=branch_id,
            include_deleted=True,
        )

        scope_filter = CodeORM.branch_id.is_(None)
        if branch_id is not None:
            scope_filter = or_(scope_filter, CodeORM.branch_id == branch_id)

        snapshots = (
            db.query(CodeORM)
            .filter(CodeORM.project_id == project_id, scope_filter)
            .all()
        )
        review_code_ids = [
            code.id
            for code in snapshots
            if current_by_concept.get(code.concept_id) is None
            or current_by_concept[code.concept_id].id != code.id
        ]
        return current_by_concept, review_code_ids

    def _to_item(
        self,
        *,
        annotation_type: AnnotationReviewType,
        annotation,
        current_by_concept: dict[UUID, CodeORM],
    ) -> AnnotationReviewItem:
        current = current_by_concept.get(annotation.code.concept_id)
        read_dto = self._read_dtos[annotation_type]
        return AnnotationReviewItem(
            annotation_type=annotation_type,
            annotation=read_dto.model_validate(annotation),
            assigned_code=CodeRead.model_validate(annotation.code),
            current_code=(
                CodeRead.model_validate(current)
                if current is not None and not current.is_deleted
                else None
            ),
        )

    def _delete(
        self, db: Session, *, annotation_type: AnnotationReviewType, annotation_id: int
    ) -> None:
        if annotation_type == AnnotationReviewType.SPAN:
            crud_span_anno.delete(db, id=annotation_id)
        elif annotation_type == AnnotationReviewType.SENTENCE:
            crud_sentence_anno.delete(db, id=annotation_id)
        else:
            crud_bbox_anno.delete(db, id=annotation_id)


annotation_review_service = AnnotationReviewService()
