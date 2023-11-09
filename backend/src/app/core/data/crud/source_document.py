from typing import List, Optional, Set, Tuple

import srsly
from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError, UpdateDTOType
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.doc_type import DocType
from app.core.data.dto.action import ActionType
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.search import (
    KeyValue,
    SpanEntity,
    SpanEntityDocumentFrequency,
    SpanEntityDocumentFrequencyResult,
    SpanEntityFrequency,
    TagStat,
)
from app.core.data.dto.source_document import (
    SDocStatus,
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentReadAction,
    SourceDocumentUpdate,
    SourceDocumentWithData,
)
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import (
    DocumentTagORM,
    SourceDocumentDocumentTagLinkTable,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session


class SourceDocumentPreprocessingUnfinishedError(Exception):
    def __init__(self, sdoc_id: int):
        super().__init__(f"SourceDocument {sdoc_id} is still getting preprocessed!")


class CRUDSourceDocument(
    CRUDBase[SourceDocumentORM, SourceDocumentCreate, SourceDocumentUpdate]
):
    def update_status(
        self, db: Session, *, sdoc_id: int, sdoc_status: SDocStatus
    ) -> SourceDocumentORM:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        sdoc_db_obj.status = sdoc_status.value
        db.add(sdoc_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

    def get_status(
        self, db: Session, *, sdoc_id: int, raise_error_on_unfinished: bool = False
    ) -> SDocStatus:
        if not self.exists(db=db, id=sdoc_id, raise_error=raise_error_on_unfinished):
            return SDocStatus.unfinished_or_erroneous
        status = SDocStatus(
            db.query(self.model.status).filter(self.model.id == sdoc_id).scalar()
        )
        if not status == SDocStatus.finished and raise_error_on_unfinished:
            raise SourceDocumentPreprocessingUnfinishedError(sdoc_id=sdoc_id)
        return status

    def read_with_data(self, db: Session, *, id: int) -> SourceDocumentWithData:
        db_obj = (
            db.query(self.model, SourceDocumentDataORM)
            .join(SourceDocumentDataORM)
            .filter(self.model.id == id)
            .first()
        )
        if not db_obj:
            raise NoSuchElementError(self.model, id=id)
        sdoc, data = db_obj.tuple()
        joined = sdoc.as_dict() | data.as_dict()
        result = SourceDocumentWithData(**joined)
        return result

    def link_document_tag(
        self, db: Session, *, sdoc_id: int, tag_id: int
    ) -> SourceDocumentORM:
        # create before_state
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        before_state = self._get_action_state_from_orm(db_obj=sdoc_db_obj)

        # link tag
        doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
        sdoc_db_obj.document_tags.append(doc_tag_db_obj)
        db.add(sdoc_db_obj)
        db.commit()

        # create after state
        db.refresh(sdoc_db_obj)
        after_state = self._get_action_state_from_orm(db_obj=sdoc_db_obj)

        # create action
        self._create_action(
            db_obj=sdoc_db_obj,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return sdoc_db_obj

    def unlink_document_tag(
        self, db: Session, *, sdoc_id: int, tag_id: int
    ) -> SourceDocumentORM:
        # create before_state
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        before_state = self._get_action_state_from_orm(db_obj=sdoc_db_obj)

        # remove tag
        doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
        sdoc_db_obj.document_tags.remove(doc_tag_db_obj)
        db.commit()

        # create after state
        db.refresh(sdoc_db_obj)
        after_state = self._get_action_state_from_orm(db_obj=sdoc_db_obj)

        # create action
        self._create_action(
            db_obj=sdoc_db_obj,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return sdoc_db_obj

    def unlink_all_document_tags(
        self, db: Session, *, sdoc_id: int
    ) -> SourceDocumentORM:
        # create before_state
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        before_state = self._get_action_state_from_orm(db_obj=sdoc_db_obj)

        # remove all tags
        sdoc_db_obj.document_tags = []
        db.commit()

        # create after state
        db.refresh(sdoc_db_obj)
        after_state = self._get_action_state_from_orm(db_obj=sdoc_db_obj)

        # create action
        self._create_action(
            db_obj=sdoc_db_obj,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return sdoc_db_obj

    def remove(self, db: Session, *, id: int) -> Optional[SourceDocumentORM]:
        sdoc_db_obj = super().remove(db=db, id=id)

        if sdoc_db_obj is not None:
            # remove file from repo
            RepoService().remove_sdoc_file(
                sdoc=SourceDocumentRead.from_orm(sdoc_db_obj)
            )

            # remove from elasticsearch
            ElasticSearchService().delete_document_from_index(
                sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
            )

        return sdoc_db_obj

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        # find all sdocs to be removed
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # delete the sdocs
        query.delete()
        db.commit()

        # remove files from repo
        RepoService().remove_all_project_sdoc_files(proj_id=proj_id)

        # remove from elasticsearch
        for sdoc_id in ids:
            ElasticSearchService().delete_document_from_index(
                proj_id=proj_id, sdoc_id=sdoc_id
            )

        return ids

    def read_by_project_and_document_tag(
        self,
        db: Session,
        *,
        proj_id: int,
        tag_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SourceDocumentORM]:
        query = db.query(self.model).join(
            SourceDocumentORM, DocumentTagORM.source_documents
        )
        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.status == SDocStatus.finished,
                DocumentTagORM.id == tag_id,
            )
        else:
            query = query.filter(
                self.model.project_id == proj_id, DocumentTagORM.id == tag_id
            )

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def get_number_of_sdocs_in_project(
        self, db: Session, *, proj_id: int, status: Optional[SDocStatus] = None
    ) -> int:
        query = db.query(self.model)
        if status is not None:
            query = query.filter(
                self.model.project_id == proj_id, self.model.status == status
            )
        else:
            query = query.filter(self.model.project_id == proj_id)
        return query.with_entities(func.count()).scalar()

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.status == SDocStatus.finished,
            )
        else:
            query = query.filter(self.model.project_id == proj_id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def read_by_filename(
        self, db: Session, *, proj_id: int, only_finished: bool = True, filename: str
    ) -> Optional[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.filename == filename,
                self.model.status == SDocStatus.finished,
            )
        else:
            query = query.filter(
                self.model.project_id == proj_id, self.model.filename == filename
            )
        return query.first()

    def count_by_project(
        self, db: Session, *, proj_id: int, only_finished: bool = True
    ) -> int:
        query = db.query(func.count(self.model.id))
        if only_finished:
            return query.filter(
                self.model.project_id == proj_id,
                self.model.status == SDocStatus.finished,
            ).scalar()
        else:
            return query.filter(self.model.project_id == proj_id).scalar()

    def get_ids_by_document_tags(
        self,
        db: Session,
        *,
        tag_ids: List[int],
        all_tags: bool = False,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[int]:
        if not all_tags:
            # all docs that have ANY of the tags
            query = db.query(self.model.id).join(
                SourceDocumentORM, DocumentTagORM.source_documents
            )
            if only_finished:
                query = query.filter(
                    and_(
                        DocumentTagORM.id.in_(tag_ids),
                        self.model.status == SDocStatus.finished,
                    )
                )
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

            query = db.query(self.model.id).join(
                SourceDocumentDocumentTagLinkTable,
                self.model.id == SourceDocumentDocumentTagLinkTable.source_document_id,
            )

            # fixme: this if is incorrect
            if only_finished:
                query = query.filter(
                    SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids)
                )
            else:
                query = query.filter(
                    and_(
                        SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids),
                        self.model.status == SDocStatus.finished,
                    )
                )
            query = query.group_by(self.model.id)
            query = query.having(func.count(self.model.id) == len(tag_ids))

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda row: row.id, query.all()))

    def get_ids_by_metadata_and_project_id(
        self,
        db: Session,
        *,
        proj_id: int,
        metadata: List[KeyValue],
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[int]:
        # We want this:
        # SELECT sourcedocument.id FROM sourcedocument
        # JOIN sourcedocumentmetadata s on sourcedocument.id = s.source_document_id
        # WHERE s.key = 'width' and s.value = '250' OR
        #       s.key = 'height' and s.value = '250' AND
        #       sourcedocument.project_id = proj_id
        # GROUP BY sourcedocument.id
        # HAVING COUNT(*) = 2

        query = db.query(self.model.id).join(
            SourceDocumentMetadataORM,
            self.model.id == SourceDocumentMetadataORM.source_document_id,
        )

        # fixme: how to filter by only_finished?
        if only_finished:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    self.model.status == SDocStatus.finished,
                    or_(
                        *[
                            (SourceDocumentMetadataORM.key == m.key)
                            & (SourceDocumentMetadataORM.value == m.value)
                            for m in metadata
                        ]
                    ),
                )
            )
        else:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    or_(
                        *[
                            (SourceDocumentMetadataORM.key == m.key)
                            & (SourceDocumentMetadataORM.value == m.value)
                            for m in metadata
                        ]
                    ),
                )
            )

        query = query.group_by(self.model.id)
        query = query.having(func.count(self.model.id) == len(metadata))

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda row: row.id, query.all()))

    def get_ids_by_starts_with_metadata_name(
        self,
        db: Session,
        *,
        proj_id: int,
        starts_with: str,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[int]:
        query = db.query(self.model.id).join(
            SourceDocumentMetadataORM,
            self.model.id == SourceDocumentMetadataORM.source_document_id,
        )

        # fixme: how to filter by only_finished?
        if only_finished:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    self.model.status == SDocStatus.finished,
                    "name" == SourceDocumentMetadataORM.key,
                    SourceDocumentMetadataORM.value.startswith(starts_with),
                )
            )
        else:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    "name" == SourceDocumentMetadataORM.key,
                    SourceDocumentMetadataORM.value.startswith(starts_with),
                )
            )

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda row: row.id, query.all()))

    def get_ids_by_doc_types_and_project_id(
        self,
        db: Session,
        *,
        doc_types: List[DocType],
        proj_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[int]:
        query = db.query(self.model.id)

        if only_finished:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    self.model.status == SDocStatus.finished,
                    self.model.doctype.in_(doc_types),
                )
            )
        else:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id, self.model.doctype.in_(doc_types)
                )
            )

        query = query.group_by(self.model.id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda row: row.id, query.all()))

    def get_ids_by_span_entities(
        self,
        db: Session,
        *,
        user_ids: Set[int] = None,
        proj_id: int,
        only_finished: bool = True,
        span_entities: List[SpanEntity],
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[int]:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)
        inner_query = (
            db.query(self.model.id)
            .join(AnnotationDocumentORM)
            .join(SpanAnnotationORM)
            .join(CurrentCodeORM)
            .join(CodeORM)
            .join(SpanTextORM)
        )

        if only_finished:
            inner_query = inner_query.filter(
                and_(
                    self.model.project_id == proj_id,
                    self.model.status == SDocStatus.finished,
                    AnnotationDocumentORM.user_id.in_(list(user_ids)),
                    or_(
                        *[
                            (CodeORM.id == se.code_id)
                            & (SpanTextORM.text == se.span_text)
                            for se in span_entities
                        ]
                    ),
                )
            )
        else:
            inner_query = inner_query.filter(
                and_(
                    self.model.project_id == proj_id,
                    AnnotationDocumentORM.user_id.in_(list(user_ids)),
                    or_(
                        *[
                            (CodeORM.id == se.code_id)
                            & (SpanTextORM.text == se.span_text)
                            for se in span_entities
                        ]
                    ),
                )
            )

        inner_query = inner_query.group_by(
            self.model.id, CurrentCodeORM.id, SpanTextORM.id
        ).from_self()

        outer_query = inner_query.group_by(self.model.id)
        outer_query = outer_query.having(
            func.count(self.model.id) == len(span_entities)
        )

        if skip is not None:
            outer_query = outer_query.offset(skip)
        if limit is not None:
            outer_query = outer_query.limit(limit)

        return list(map(lambda row: row.id, outer_query.all()))

    def collect_entity_stats(
        self,
        db: Session,
        *,
        user_ids: Set[int] = None,
        sdoc_ids: Set[int] = None,
        proj_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SpanEntityFrequency]:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)

        query = (
            db.query(
                self.model.id, CodeORM.id, SpanTextORM.text, func.count().label("count")
            )
            .join(AnnotationDocumentORM)
            .join(SpanAnnotationORM)
            .join(CurrentCodeORM)
            .join(CodeORM)
            .join(SpanTextORM)
        )

        if only_finished:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    self.model.id.in_(list(sdoc_ids)),
                    self.model.status == SDocStatus.finished,
                    AnnotationDocumentORM.user_id.in_(list(user_ids)),
                )
            )
        else:
            query = query.filter(
                and_(
                    self.model.project_id == proj_id,
                    self.model.id.in_(list(sdoc_ids)),
                    AnnotationDocumentORM.user_id.in_(list(user_ids)),
                )
            )

        query = query.group_by(self.model.id, CodeORM.id, SpanTextORM.id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        res = query.all()

        return [
            SpanEntityFrequency(
                sdoc_id=sdoc_id, code_id=code_id, span_text=text, count=count
            )
            for (sdoc_id, code_id, text, count) in res
        ]

    # noinspection PyUnresolvedReferences
    def collect_code_stats(
        self,
        db: Session,
        *,
        user_ids: Set[int] = None,
        sdoc_ids: Set[int] = None,
        proj_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> SpanEntityDocumentFrequencyResult:
        # Flo: we always want ADocs from the SYSTEM_USER
        if not user_ids:
            user_ids = set()
        user_ids.add(SYSTEM_USER_ID)

        filtered_res = self._query_code_stats(
            db,
            user_ids=user_ids,
            sdoc_ids=sdoc_ids,
            proj_id=proj_id,
            only_finished=only_finished,
            skip=skip,
            limit=limit,
        )
        filtered_res.sort(key=lambda x: (x[0], x[1]))

        code_ids = [r.code_id for r in filtered_res]
        texts = [r.text for r in filtered_res]

        global_res = self._query_code_stats(
            db,
            user_ids=user_ids,
            proj_id=proj_id,
            code_ids=code_ids,
            texts=texts,
            only_finished=only_finished,
        )
        global_res.sort(key=lambda x: (x[0], x[1]))

        stats = dict()
        i = 0
        for f in filtered_res:
            # global_res might contain matches with same text but different code than in the filtered collection
            while global_res[i].code_id != f.code_id or global_res[i].text != f.text:
                i += 1
            doc_freqs = stats.get(f.code_id, [])
            doc_freqs.append(
                SpanEntityDocumentFrequency(
                    code_id=f.code_id,
                    filtered_count=f.doc_freq,
                    global_count=global_res[i].doc_freq,
                    span_text=f.text,
                )
            )
            stats[f.code_id] = doc_freqs

        return SpanEntityDocumentFrequencyResult(stats=stats)

    def _query_code_stats(
        self,
        db: Session,
        *,
        user_ids: Set[int] = None,
        sdoc_ids: Set[int] = None,
        proj_id: int,
        code_ids: List[int] = None,
        texts: List[str] = None,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[Tuple[int, str, int]]:
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

        inner_query = (
            db.query(
                self.model.id.label("sdoc_id"),
                CodeORM.id.label("code_id"),
                SpanTextORM.text.label("text"),
            )
            .distinct()
            .join(AnnotationDocumentORM)
            .join(SpanAnnotationORM)
            .join(CurrentCodeORM)
            .join(CodeORM)
            .join(SpanTextORM)
        )

        inner_query = inner_query.filter(
            self.model.project_id == proj_id,
            CodeORM.name != "SENTENCE",
            AnnotationDocumentORM.user_id.in_(list(user_ids)),
        )

        if only_finished:
            inner_query = inner_query.filter(self.model.status == SDocStatus.finished)
        if sdoc_ids is not None and len(sdoc_ids) > 0:
            inner_query = inner_query.filter(self.model.id.in_(list(sdoc_ids)))
        if code_ids is not None and len(code_ids) > 0:
            inner_query = inner_query.filter(CodeORM.id.in_(code_ids))
        if texts is not None and len(texts) > 0:
            inner_query = inner_query.filter(SpanTextORM.text.in_(texts))
        inner_query = inner_query.subquery()

        doc_freq = func.count(inner_query.c.sdoc_id).label("doc_freq")
        outer_query = db.query(inner_query.c.code_id, inner_query.c.text, doc_freq)
        outer_query = outer_query.group_by(inner_query.c.code_id, inner_query.c.text)
        outer_query = outer_query.order_by(doc_freq.desc())

        if skip is not None:
            outer_query = outer_query.offset(skip)
        if limit is not None:
            outer_query = outer_query.limit(limit)

        res = outer_query.all()
        return res

    def collect_tag_stats(
        self, db: Session, *, sdoc_ids: Set[int] = None
    ) -> List[TagStat]:
        # SELECT t.title, count(t.id) FROM documenttag t
        # JOIN sourcedocumentdocumenttaglinktable lt ON lt.document_tag_id = t.id
        # WHERE lt.source_document_id in (1, 2, 3)
        # GROUP BY t.id, t.title
        count = func.count().label("count")
        query = db.query(DocumentTagORM, count).join(
            SourceDocumentDocumentTagLinkTable,
            SourceDocumentDocumentTagLinkTable.document_tag_id == DocumentTagORM.id,
        )

        # noinspection PyUnresolvedReferences
        query = query.filter(
            SourceDocumentDocumentTagLinkTable.source_document_id.in_(list(sdoc_ids))
        )
        query = query.group_by(DocumentTagORM.id)
        query = query.order_by(desc(count))

        filtered_res = query.all()

        tag_ids = [tag.id for tag, _ in filtered_res]

        count = func.count().label("count")
        query = (
            db.query(SourceDocumentDocumentTagLinkTable.document_tag_id, count)
            .filter(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids))
            .group_by(SourceDocumentDocumentTagLinkTable.document_tag_id)
            .order_by(
                func.array_position(
                    tag_ids, SourceDocumentDocumentTagLinkTable.document_tag_id
                )
            )
        )

        global_res = query.all()

        return [
            TagStat(tag=tag, filtered_count=fcount, global_count=gcount)
            for (tag, fcount), (tid, gcount) in zip(filtered_res, global_res)
        ]

    def collect_linked_sdoc_ids(self, db: Session, *, sdoc_id: int) -> List[int]:
        # SELECT * FROM sourcedocumentlink sl
        # WHERE (sl.linked_source_document_id = 1 OR
        #       sl.parent_source_document_id = 1) and sl.linked_source_document_id IS NOT NULL

        query = db.query(
            SourceDocumentLinkORM.parent_source_document_id,
            SourceDocumentLinkORM.linked_source_document_id,
        )

        # noinspection PyUnresolvedReferences
        query = query.filter(
            and_(
                or_(
                    SourceDocumentLinkORM.parent_source_document_id == sdoc_id,
                    SourceDocumentLinkORM.linked_source_document_id == sdoc_id,
                ),
                SourceDocumentLinkORM.linked_source_document_id is not None,
            )
        )
        query = query.order_by(desc(SourceDocumentLinkORM.parent_source_document_id))

        res = query.all()
        return [
            linked_sdoc_id if parent_sdoc_id == sdoc_id else parent_sdoc_id
            for (parent_sdoc_id, linked_sdoc_id) in res
            if linked_sdoc_id is not None
        ]

    def _get_action_state_from_orm(self, db_obj: SourceDocumentORM) -> Optional[str]:
        with SQLService().db_session() as db:
            metadata = crud_sdoc_meta.read_by_sdoc(db, sdoc_id=db_obj.id)

        return srsly.json_dumps(
            SourceDocumentReadAction(
                **SourceDocumentRead.from_orm(db_obj).dict(),
                tags=[DocumentTagRead.from_orm(tag) for tag in db_obj.document_tags],
                metadata=[SourceDocumentMetadataRead.from_orm(md) for md in metadata],
                # TODO: can we get the keywords?
            ).dict()
        )


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
