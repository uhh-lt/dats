from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationRead
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.code.code_dto import CodeRead
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_crud import crud_memo
from core.project.project_crud import crud_project
from core.tag.tag_dto import TagRead
from modules.whiteboard.whiteboard_dto import (
    BBoxAnnotationNodeData,
    MemoNodeData,
    SdocNodeData,
    SentenceAnnotationNodeData,
    SpanAnnotationNodeData,
    WhiteboardCreateIntern,
    WhiteboardData,
    WhiteboardNode,
    WhiteboardNodeType,
    WhiteboardRead,
    WhiteboardUpdateIntern,
)
from modules.whiteboard.whiteboard_orm import WhiteboardORM
from repos.db.crud_base import CRUDBase


class CRUDWhiteboard(
    CRUDBase[WhiteboardORM, WhiteboardCreateIntern, WhiteboardUpdateIntern]
):
    def read_by_project(self, db: Session, *, project_id: int) -> list[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_obj

    def read_data(self, db: Session, *, id: int) -> WhiteboardData:
        db_obj = self.read(db, id=id)
        whiteboard = WhiteboardRead.model_validate(db_obj)

        # group nodes by their type
        whiteboard_nodes: dict[str, list[WhiteboardNode]] = {
            node_type.value: [] for node_type in WhiteboardNodeType
        }
        for node in whiteboard.content.nodes:
            if node.type in whiteboard_nodes:
                whiteboard_nodes[node.type].append(node)

        # fetch all data by type
        result = WhiteboardData(
            sdocs=[],
            codes=[],
            tags=[],
            span_annotations=[],
            sent_annotations=[],
            bbox_annotations=[],
            memos=[],
        )
        for node_type, nodes in whiteboard_nodes.items():
            match node_type:
                case WhiteboardNodeType.SPAN_ANNOTATION:
                    span_ids = [
                        SpanAnnotationNodeData.model_validate(
                            node.data
                        ).spanAnnotationId
                        for node in nodes
                    ]
                    result.span_annotations = [
                        SpanAnnotationRead.model_validate(sa)
                        for sa in crud_span_anno.read_by_ids(db=db, ids=span_ids)
                    ]
                case WhiteboardNodeType.SENTENCE_ANNOTATION:
                    sent_ids = [
                        SentenceAnnotationNodeData.model_validate(
                            node.data
                        ).sentenceAnnotationId
                        for node in nodes
                    ]
                    result.sent_annotations = [
                        SentenceAnnotationRead.model_validate(sa)
                        for sa in crud_sentence_anno.read_by_ids(db=db, ids=sent_ids)
                    ]
                case WhiteboardNodeType.BBOX_ANNOTATION:
                    bbox_ids = [
                        BBoxAnnotationNodeData.model_validate(
                            node.data
                        ).bboxAnnotationId
                        for node in nodes
                    ]
                    result.bbox_annotations = [
                        BBoxAnnotationRead.model_validate(b)
                        for b in crud_bbox_anno.read_by_ids(db=db, ids=bbox_ids)
                    ]
                case WhiteboardNodeType.MEMO:
                    memo_ids = [
                        MemoNodeData.model_validate(node.data).memoId for node in nodes
                    ]
                    result.memos = [
                        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=m)
                        for m in crud_memo.read_by_ids(db=db, ids=memo_ids)
                    ]
                case WhiteboardNodeType.SDOC:
                    sdoc_ids = [
                        SdocNodeData.model_validate(node.data).sdocId for node in nodes
                    ]
                    result.sdocs = [
                        SourceDocumentRead.model_validate(s)
                        for s in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
                    ]
                case WhiteboardNodeType.CODE:
                    if len(nodes) > 0:
                        result.codes = [
                            CodeRead.model_validate(c)
                            for c in crud_project.read(
                                db=db, id=whiteboard.project_id
                            ).codes
                        ]
                case WhiteboardNodeType.TAG:
                    if len(nodes) > 0:
                        result.tags = [
                            TagRead.model_validate(c)
                            for c in crud_project.read(
                                db=db, id=whiteboard.project_id
                            ).tags
                        ]

        return result

    def duplicate_by_id(
        self,
        db: Session,
        *,
        whiteboard_id: int,
    ) -> WhiteboardORM:
        db_obj = self.read(db, id=whiteboard_id)
        return self.create(
            db,
            create_dto=WhiteboardCreateIntern(
                project_id=db_obj.project_id,
                title=db_obj.title + " (Copy)",
                content=db_obj.content,
            ),
        )


crud_whiteboard = CRUDWhiteboard(WhiteboardORM)
