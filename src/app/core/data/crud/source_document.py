from typing import List, Set

from sqlalchemy import delete, func, and_, or_
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.search import SpanEntity, SpanEntityStat
from app.core.data.dto.source_document import SourceDocumentCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CurrentCodeORM, CodeORM
from app.core.data.orm.document_tag import DocumentTagORM, SourceDocumentDocumentTagLinkTable
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM


class CRUDSourceDocument(CRUDBase[SourceDocumentORM, SourceDocumentCreate, None]):
    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update SourceDocument
        raise NotImplementedError()

    def link_document_tag(self, db: Session, *, sdoc_id: int, tag_id: int) -> SourceDocumentORM:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
        sdoc_db_obj.document_tags.append(doc_tag_db_obj)
        db.add(sdoc_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

    def unlink_document_tag(self, db: Session, *, sdoc_id: int, tag_id: int) -> SourceDocumentORM:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
        sdoc_db_obj.document_tags.remove(doc_tag_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

    def unlink_all_document_tags(self, db: Session, *, sdoc_id: int) -> SourceDocumentORM:
        db_obj = self.read(db=db, id=sdoc_id)
        db_obj.document_tags = []
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def read_by_project_and_document_tag(self, db: Session, *, proj_id: int, tag_id: int) -> List[SourceDocumentORM]:
        return db.query(self.model).join(SourceDocumentORM, DocumentTagORM.source_documents) \
            .filter(self.model.project_id == proj_id, DocumentTagORM.id == tag_id).all()

    def read_by_project(self,
                        db: Session,
                        *,
                        proj_id: int,
                        skip: int = 0,
                        limit: int = 100) -> List[SourceDocumentORM]:
        return db.query(self.model).filter(self.model.project_id == proj_id).offset(skip).limit(limit).all()

    def read_by_project_and_document_tags(self,
                                          db: Session,
                                          *,
                                          proj_id: int,
                                          tag_ids: List[int],
                                          all_tags: bool = False,
                                          skip: int = 0,
                                          limit: int = 100) -> List[SourceDocumentORM]:
        if not all_tags:
            # all docs that have ANY of the tags
            # noinspection PyUnresolvedReferences
            return db.query(self.model).join(SourceDocumentORM, DocumentTagORM.source_documents) \
                .filter(self.model.project_id == proj_id,
                        DocumentTagORM.id.in_(tag_ids)).offset(skip).limit(limit).all()
        else:
            # all docs that have ALL the tags
            """
            We want this: 
                SELECT *
                FROM sourcedocument
                INNER JOIN sourcedocumentdocumenttaglinktable
                    ON sourcedocument.id = sourcedocumentdocumenttaglinktable.source_document_id
                WHERE sourcedocumentdocumenttaglinktable.document_tag_id IN ( TAG_IDS )
                GROUP BY sourcedocument.id
                HAVING COUNT(*) = len(TAG_IDS)
            """
            query = db.query(self.model).join(SourceDocumentDocumentTagLinkTable,
                                              self.model.id == SourceDocumentDocumentTagLinkTable.source_document_id)
            # noinspection PyUnresolvedReferences
            query = query.filter(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids))
            query = query.group_by(self.model.id)
            query = query.having(func.count(self.model.id) == len(tag_ids))
            return query.offset(skip).limit(limit).all()

    def read_by_span_entities(self,
                              db: Session,
                              *,
                              user_ids: Set[int] = None,
                              proj_id: int,
                              span_entities: List[SpanEntity],
                              skip: int = 0,
                              limit: int = 100) -> List[SourceDocumentORM]:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)
        query = db.query(self.model) \
            .join(AnnotationDocumentORM) \
            .join(SpanAnnotationORM) \
            .join(CurrentCodeORM) \
            .join(CodeORM) \
            .join(SpanTextORM)
        # noinspection PyUnresolvedReferences
        query = query.filter(and_(SourceDocumentORM.project_id == proj_id,
                                  AnnotationDocumentORM.user_id.in_(list(user_ids)),
                                  or_(*[(CodeORM.id == se.code_id) & (SpanTextORM.text == se.span_text)
                                        for se in span_entities])))
        query = query.group_by(self.model.id, CurrentCodeORM.id, SpanTextORM.id)
        query = query.having(func.count(self.model.id) == len(span_entities)).offset(skip).limit(limit)
        return query.all()

    def collect_entity_stats(self,
                             db: Session,
                             *,
                             user_ids: Set[int] = None,
                             sdoc_ids: Set[int] = None,
                             proj_id: int,
                             skip: int = 0,
                             limit: int = 100) -> List[SpanEntityStat]:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)

        query = db.query(self.model.id, CodeORM.id, SpanTextORM.text, func.sum(self.model.id).label("count")) \
            .join(AnnotationDocumentORM) \
            .join(SpanAnnotationORM) \
            .join(CurrentCodeORM) \
            .join(CodeORM) \
            .join(SpanTextORM)
        # noinspection PyUnresolvedReferences
        query = query.filter(and_(SourceDocumentORM.project_id == proj_id,
                                  SourceDocumentORM.id.in_(list(sdoc_ids)),
                                  AnnotationDocumentORM.user_id.in_(list(user_ids))))
        query = query.group_by(self.model.id, CodeORM.id, SpanTextORM.id)

        res = query.offset(skip).limit(limit).all()
        return [SpanEntityStat(sdoc_id=sdoc_id,
                               span_entity=SpanEntity(code_id=code_id,
                                                      span_text=text),
                               count=count) for (sdoc_id, code_id, text, count) in res]


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
