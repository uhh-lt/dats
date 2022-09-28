from typing import List, Set, Optional

from sqlalchemy import delete, func, and_, or_, desc
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.search import SpanEntity, SpanEntityStat, TagStat
from app.core.data.dto.source_document import SourceDocumentCreate, SourceDocumentRead, SDocStatus
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CurrentCodeORM, CodeORM
from app.core.data.orm.document_tag import DocumentTagORM, SourceDocumentDocumentTagLinkTable
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.repo.repo_service import RepoService


class CRUDSourceDocument(CRUDBase[SourceDocumentORM, SourceDocumentCreate, None]):
    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        # Flo: We no not want to update SourceDocument
        raise NotImplementedError()

    def update_status(self, db: Session, *, sdoc_id: int, sdoc_status: SDocStatus) -> ORMModelType:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        sdoc_db_obj.status = sdoc_status.value
        db.add(sdoc_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

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

    def remove(self, db: Session, *, id: int) -> Optional[SourceDocumentORM]:
        sdoc_db_obj = super().remove(db=db, id=id)

        # remove file from repo
        RepoService().remove_sdoc_file(sdoc=SourceDocumentRead.from_orm(sdoc_db_obj))

        return sdoc_db_obj

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        removed_ids = list(map(lambda t: t[0], removed_ids))

        # remove files from repo
        RepoService().remove_all_project_sdoc_files(proj_id=proj_id)

        return removed_ids

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

    def get_ids_by_document_tags(self,
                                 db: Session,
                                 *,
                                 tag_ids: List[int],
                                 all_tags: bool = False,
                                 skip: Optional[int] = None,
                                 limit: Optional[int] = None) -> List[int]:
        if not all_tags:
            # all docs that have ANY of the tags
            # noinspection PyUnresolvedReferences
            query = db.query(self.model.id) \
                .join(SourceDocumentORM, DocumentTagORM.source_documents) \
                .filter(DocumentTagORM.id.in_(tag_ids)).offset(skip).limit(limit)

            return list(map(lambda row: row.id, query.all()))
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
            query = db.query(self.model.id).join(SourceDocumentDocumentTagLinkTable,
                                                 self.model.id == SourceDocumentDocumentTagLinkTable.source_document_id)
            # noinspection PyUnresolvedReferences
            query = query.filter(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids))
            query = query.group_by(self.model.id)
            query = query.having(func.count(self.model.id) == len(tag_ids))

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda row: row.id, query.all()))

    def get_ids_by_span_entities(self,
                                 db: Session,
                                 *,
                                 user_ids: Set[int] = None,
                                 proj_id: int,
                                 span_entities: List[SpanEntity],
                                 skip: Optional[int] = None,
                                 limit: Optional[int] = None) -> List[int]:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)
        inner_query = db.query(self.model.id) \
            .join(AnnotationDocumentORM) \
            .join(SpanAnnotationORM) \
            .join(CurrentCodeORM) \
            .join(CodeORM) \
            .join(SpanTextORM)
        # noinspection PyUnresolvedReferences
        inner_query = inner_query.filter(and_(self.model.project_id == proj_id,
                                              AnnotationDocumentORM.user_id.in_(list(user_ids)),
                                              or_(*[(CodeORM.id == se.code_id) & (SpanTextORM.text == se.span_text)
                                                    for se in span_entities])))
        inner_query = inner_query.group_by(self.model.id, CurrentCodeORM.id, SpanTextORM.id).from_self()

        outer_query = inner_query.group_by(self.model.id)
        outer_query = outer_query.having(func.count(self.model.id) == len(span_entities))

        if skip is not None:
            outer_query = outer_query.offset(skip)
        if limit is not None:
            outer_query = outer_query.limit(limit)

        return list(map(lambda row: row.id, outer_query.all()))

    def collect_entity_stats(self,
                             db: Session,
                             *,
                             user_ids: Set[int] = None,
                             sdoc_ids: Set[int] = None,
                             proj_id: int,
                             skip: Optional[int] = None,
                             limit: Optional[int] = None) -> List[SpanEntityStat]:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)

        query = db.query(self.model.id, CodeORM.id, SpanTextORM.text, func.count().label("count")) \
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

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        res = query.all()

        return [SpanEntityStat(sdoc_id=sdoc_id,
                               span_entity=SpanEntity(code_id=code_id,
                                                      span_text=text),
                               count=count) for (sdoc_id, code_id, text, count) in res]

    def collect_tag_stats(self,
                          db: Session,
                          *,
                          sdoc_ids: Set[int] = None) -> List[TagStat]:

        # SELECT t.title, count(t.id) FROM documenttag t
        # JOIN sourcedocumentdocumenttaglinktable lt ON lt.document_tag_id = t.id
        # WHERE lt.source_document_id in (1, 2, 3)
        # GROUP BY t.id, t.title
        count = func.count().label("count")
        query = db.query(DocumentTagORM, count) \
            .join(SourceDocumentDocumentTagLinkTable,
                  SourceDocumentDocumentTagLinkTable.document_tag_id == DocumentTagORM.id)

        # noinspection PyUnresolvedReferences
        query = query.filter(SourceDocumentDocumentTagLinkTable.source_document_id.in_(list(sdoc_ids)))
        query = query.group_by(DocumentTagORM.id)
        query = query.order_by(desc(count))

        res = query.all()
        return [TagStat(tag=tag, count=count) for (tag, count) in res]


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
