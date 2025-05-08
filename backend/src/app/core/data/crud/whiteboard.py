from typing import Dict, List

from sqlalchemy.orm import Session

from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.bbox_annotation import BBoxAnnotationRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.sentence_annotation import SentenceAnnotationRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.data.dto.whiteboard import (
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
from app.core.data.orm.whiteboard import WhiteboardORM


class CRUDWhiteboard(
    CRUDBase[WhiteboardORM, WhiteboardCreateIntern, WhiteboardUpdateIntern]
):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int
    ) -> List[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        return db_obj

    def read_by_project(self, db: Session, *, project_id: int) -> List[WhiteboardORM]:
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
        whiteboard_nodes: Dict[str, List[WhiteboardNode]] = {
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
                        MemoRead.model_validate(m)
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
                            DocumentTagRead.model_validate(c)
                            for c in crud_project.read(
                                db=db, id=whiteboard.project_id
                            ).document_tags
                        ]

        return result

    def duplicate_by_id(
        self, db: Session, *, whiteboard_id: int, user_id: int
    ) -> WhiteboardORM:
        db_obj = self.read(db, id=whiteboard_id)
        return self.create(
            db,
            create_dto=WhiteboardCreateIntern(
                project_id=db_obj.project_id,
                user_id=user_id,
                title=db_obj.title + " (Copy)",
                content=db_obj.content,
            ),
        )


crud_whiteboard = CRUDWhiteboard(WhiteboardORM)
