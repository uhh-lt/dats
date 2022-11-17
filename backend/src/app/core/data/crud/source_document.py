from typing import List, Set, Optional

from sqlalchemy import delete, func, and_, or_, desc
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.search import SpanEntity, SpanEntityFrequency, TagStat, SpanEntityDocumentFrequency, \
    SpanEntityDocumentFrequencyResult, KeyValue
from app.core.data.dto.source_document import SourceDocumentCreate, SourceDocumentRead, SDocStatus
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CurrentCodeORM, CodeORM
from app.core.data.orm.document_tag import DocumentTagORM, SourceDocumentDocumentTagLinkTable
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.repo.repo_service import RepoService


class SourceDocumentPreprocessingUnfinishedError(Exception):
    def __init__(self, sdoc_id: int):
        super().__init__(f"SourceDocument {sdoc_id} is still getting preprocessed!")


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

    def get_status(self, db: Session, *, sdoc_id: int, raise_error_on_unfinished: bool = False) -> SDocStatus:
        if not self.exists(db=db, id=sdoc_id, raise_error=raise_error_on_unfinished):
            return SDocStatus.undefined_or_erroneous
        status = SDocStatus(db.query(self.model.status).filter(self.model.id == sdoc_id).scalar())
        if not status == SDocStatus.finished and raise_error_on_unfinished:
            raise SourceDocumentPreprocessingUnfinishedError(sdoc_id=sdoc_id)
        return status

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

    def read_by_project_and_document_tag(self,
                                         db: Session,
                                         *,
                                         proj_id: int,
                                         tag_id: int,
                                         only_finished: bool = True,
                                         skip: Optional[int] = None,
                                         limit: Optional[int] = None) -> List[SourceDocumentORM]:
        query = db.query(self.model).join(SourceDocumentORM, DocumentTagORM.source_documents)
        if only_finished:
            query = query.filter(self.model.project_id == proj_id,
                                 self.model.status == SDocStatus.finished,
                                 DocumentTagORM.id == tag_id)
        else:
            query = query.filter(self.model.project_id == proj_id, DocumentTagORM.id == tag_id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def get_number_of_sdocs_in_project_by_status(self,
                                                 db: Session,
                                                 *,
                                                 proj_id: int,
                                                 status: SDocStatus) -> int:
        return db.query(self.model).filter(self.model.project_id == proj_id,
                                           self.model.status == status) \
            .with_entities(func.count()).scalar()

    def read_by_project(self,
                        db: Session,
                        *,
                        proj_id: int,
                        only_finished: bool = True,
                        skip: Optional[int] = None,
                        limit: Optional[int] = None) -> List[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(self.model.project_id == proj_id,
                                 self.model.status == SDocStatus.finished)
        else:
            query = query.filter(self.model.project_id == proj_id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def count_by_project(self,
                         db: Session,
                         *,
                         proj_id: int,
                         only_finished: bool = True) -> int:
        query = db.query(func.count(self.model.id))
        if only_finished:
            return query.filter(self.model.project_id == proj_id, self.model.status == SDocStatus.finished).scalar()
        else:
            return query.filter(self.model.project_id == proj_id).scalar()

    def get_ids_by_document_tags(self,
                                 db: Session,
                                 *,
                                 tag_ids: List[int],
                                 all_tags: bool = False,
                                 only_finished: bool = True,
                                 skip: Optional[int] = None,
                                 limit: Optional[int] = None) -> List[int]:
        if not all_tags:
            # all docs that have ANY of the tags
            query = db.query(self.model.id) \
                .join(SourceDocumentORM, DocumentTagORM.source_documents)
            if only_finished:
                query = query.filter(and_(DocumentTagORM.id.in_(tag_ids), self.model.status == SDocStatus.finished))
            else:
                query = query.filter(DocumentTagORM.id.in_(tag_ids))
        else:
            # all docs that have ALL the tags

            # We want this:
            #     SELECT *
            #     FROM sourcedocument
            #     INNER JOIN sourcedocumentdocumenttaglinktable
            #         ON sourcedocument.id = sourcedocumentdocumenttaglinktable.source_document_id
            #     WHERE sourcedocumentdocumenttaglinktable.document_tag_id IN ( TAG_IDS )
            #     GROUP BY sourcedocument.id
            #     HAVING COUNT(*) = len(TAG_IDS)

            query = db.query(self.model.id).join(SourceDocumentDocumentTagLinkTable,
                                                 self.model.id == SourceDocumentDocumentTagLinkTable.source_document_id)

            # fixme: this if is incorrect
            if only_finished:
                query = query.filter(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids))
            else:
                query = query.filter(and_(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids),
                                          self.model.status == SDocStatus.finished))
            query = query.group_by(self.model.id)
            query = query.having(func.count(self.model.id) == len(tag_ids))

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda row: row.id, query.all()))

    def get_ids_by_metadata_and_project_id(self,
                                           db: Session,
                                           *,
                                           proj_id: int,
                                           metadata: List[KeyValue],
                                           only_finished: bool = True,
                                           skip: Optional[int] = None,
                                           limit: Optional[int] = None) -> List[int]:
        # We want this:
        # SELECT sourcedocument.id FROM sourcedocument
        # JOIN sourcedocumentmetadata s on sourcedocument.id = s.source_document_id
        # WHERE s.key = 'width' and s.value = '250' OR
        #       s.key = 'height' and s.value = '250' AND
        #       sourcedocument.project_id = proj_id
        # GROUP BY sourcedocument.id
        # HAVING COUNT(*) = 2

        query = db.query(self.model.id).join(SourceDocumentMetadataORM,
                                             self.model.id == SourceDocumentMetadataORM.source_document_id)

        # fixme: how to filter by only_finished?
        if only_finished:
            query = query.filter(and_(self.model.project_id == proj_id,
                                      self.model.status == SDocStatus.finished,
                                      or_(*[(SourceDocumentMetadataORM.key == m.key)
                                            & (SourceDocumentMetadataORM.value == m.value)
                                            for m in metadata]))
                                 )
        else:
            query = query.filter(and_(self.model.project_id == proj_id,
                                      or_(*[(SourceDocumentMetadataORM.key == m.key)
                                            & (SourceDocumentMetadataORM.value == m.value)
                                            for m in metadata]))
                                 )

        query = query.group_by(self.model.id)
        query = query.having(func.count(self.model.id) == len(metadata))

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
                                 only_finished: bool = True,
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

        if only_finished:
            inner_query = inner_query.filter(and_(self.model.project_id == proj_id,
                                                  self.model.status == SDocStatus.finished,
                                                  AnnotationDocumentORM.user_id.in_(list(user_ids)),
                                                  or_(*[(CodeORM.id == se.code_id) & (SpanTextORM.text == se.span_text)
                                                        for se in span_entities])))
        else:
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
                             only_finished: bool = True,
                             skip: Optional[int] = None,
                             limit: Optional[int] = None) -> List[SpanEntityFrequency]:
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

        if only_finished:
            query = query.filter(and_(self.model.project_id == proj_id,
                                      self.model.id.in_(list(sdoc_ids)),
                                      self.model.status == SDocStatus.finished,
                                      AnnotationDocumentORM.user_id.in_(list(user_ids))))
        else:
            query = query.filter(and_(self.model.project_id == proj_id,
                                      self.model.id.in_(list(sdoc_ids)),
                                      AnnotationDocumentORM.user_id.in_(list(user_ids))))

        query = query.group_by(self.model.id, CodeORM.id, SpanTextORM.id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        res = query.all()

        return [SpanEntityFrequency(sdoc_id=sdoc_id,
                                    code_id=code_id,
                                    span_text=text,
                                    count=count) for (sdoc_id, code_id, text, count) in res]

    # noinspection PyUnresolvedReferences
    def collect_entity_document_stats(self,
                                      db: Session,
                                      *,
                                      user_ids: Set[int] = None,
                                      sdoc_ids: Set[int] = None,
                                      proj_id: int,
                                      only_finished: bool = True,
                                      skip: Optional[int] = None,
                                      limit: Optional[int] = None) -> SpanEntityDocumentFrequencyResult:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)

        # we want this:
        # SELECT code_id, text, count(sdoc_id) FROM (SELECT DISTINCT sourcedocument.id AS sdoc_id, code.id AS code_id, spantext.text AS text
        #        FROM sourcedocument
        #                 JOIN annotationdocument ON sourcedocument.id = annotationdocument.source_document_id
        #                 JOIN spanannotation ON annotationdocument.id = spanannotation.annotation_document_id
        #                 JOIN currentcode ON currentcode.id = spanannotation.current_code_id
        #                 JOIN code ON code.id = currentcode.code_id
        #                 JOIN spantext ON spantext.id = spanannotation.span_text_id
        #        WHERE sourcedocument.project_id = 1
        #          AND sourcedocument.id IN (1, 2, 3, 4, 5, 7, 8, 9, 999)
        #          AND annotationdocument.user_id IN (1) ) AS TMP
        # GROUP BY text, code_id

        inner_query = db.query(self.model.id.label("sdoc_id"), CodeORM.id.label("code_id"),
                               SpanTextORM.text.label("text")).distinct() \
            .join(AnnotationDocumentORM) \
            .join(SpanAnnotationORM) \
            .join(CurrentCodeORM) \
            .join(CodeORM) \
            .join(SpanTextORM)

        if only_finished:
            inner_query = inner_query.filter(and_(self.model.project_id == proj_id,
                                                  self.model.id.in_(list(sdoc_ids)),
                                                  CodeORM.name != "SENTENCE",
                                                  self.model.status == SDocStatus.finished,
                                                  AnnotationDocumentORM.user_id.in_(list(user_ids)))).subquery()
        else:
            inner_query = inner_query.filter(and_(self.model.project_id == proj_id,
                                                  self.model.id.in_(list(sdoc_ids)),
                                                  CodeORM.name != "SENTENCE",
                                                  AnnotationDocumentORM.user_id.in_(list(user_ids)))).subquery()

        doc_freq = func.count(inner_query.c.sdoc_id).label("doc_freq")
        outer_query = db.query(inner_query.c.code_id, inner_query.c.text, doc_freq)
        outer_query = outer_query.group_by(inner_query.c.code_id, inner_query.c.text)
        outer_query = outer_query.order_by(doc_freq.desc())

        if skip is not None:
            outer_query = outer_query.offset(skip)
        if limit is not None:
            outer_query = outer_query.limit(limit)

        res = outer_query.all()

        stats = dict()
        for r in res:
            doc_freqs = stats.get(r.code_id, [])
            doc_freqs.append(SpanEntityDocumentFrequency(code_id=r.code_id, count=r.doc_freq, span_text=r.text))
            stats[r.code_id] = doc_freqs

        return SpanEntityDocumentFrequencyResult(stats=stats)

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
