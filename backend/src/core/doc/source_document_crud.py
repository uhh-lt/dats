from typing import Dict, List, Optional

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_data_dto import SourceDocumentDataRead
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_dto import (
    SDocStatus,
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from core.doc.source_document_link_orm import SourceDocumentLinkORM
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.document_tag_orm import DocumentTagORM
from fastapi.encoders import jsonable_encoder
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.document_aspect_orm import DocumentAspectORM
from repos.db.crud_base import CRUDBase, NoSuchElementError
from repos.db.sql_utils import aggregate_ids
from repos.elasticsearch_repo import ElasticSearchService
from repos.filesystem_repo import RepoService
from repos.vector.weaviate_repo import WeaviateService
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


class SourceDocumentPreprocessingUnfinishedError(Exception):
    def __init__(self, sdoc_id: int):
        super().__init__(f"SourceDocument {sdoc_id} is still getting preprocessed!")


class CRUDSourceDocument(
    CRUDBase[SourceDocumentORM, SourceDocumentCreate, SourceDocumentUpdate]
):
    def create(
        self, db: Session, *, create_dto: SourceDocumentCreate
    ) -> SourceDocumentORM:
        try:
            # If folder_id not provided, create a folder with same name as the document
            if create_dto.folder_id is None:
                folder_create = FolderCreate(
                    name=create_dto.filename,
                    folder_type=FolderType.SDOC_FOLDER,
                    project_id=create_dto.project_id,
                )
                created_folder = crud_folder.create(db=db, create_dto=folder_create)

                # Create the source document with the folder_id
                create_dto = create_dto.model_copy(
                    update={"folder_id": created_folder.id}
                )

            dto_obj_data = jsonable_encoder(create_dto)
            db_obj = self.model(**dto_obj_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj

        except SQLAlchemyError as e:
            db.rollback()
            raise e

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

    def read_data(self, db: Session, *, id: int) -> SourceDocumentDataRead:
        db_obj = (
            db.query(SourceDocumentDataORM)
            .filter(SourceDocumentDataORM.id == id)
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return SourceDocumentDataRead.model_validate(db_obj)

    def read_data_batch(
        self, db: Session, *, ids: List[int]
    ) -> List[Optional[SourceDocumentDataORM]]:
        db_objs = (
            db.query(SourceDocumentDataORM)
            .filter(SourceDocumentDataORM.id.in_(ids))
            .all()
        )
        # create id, data map
        id2data = {db_obj.id: db_obj for db_obj in db_objs}
        return [id2data.get(id) for id in ids]

    def read_text_data_with_no_aspect(
        self, db: Session, *, project_id: int, aspect_id: int
    ) -> List[SourceDocumentDataORM]:
        """
        Read all source documents that have no aspect and are of type text.
        This is used to find all source documents that need to be preprocessed.

        :param db: The database session.
        :param project_id: The ID of the project.
        :param aspect_id: The ID of the aspect.
        :return: A list of source documents of the given project that have no aspect and are of type text.
        """
        return (
            db.query(SourceDocumentDataORM)
            .join(SourceDocumentORM, SourceDocumentORM.id == SourceDocumentDataORM.id)
            .outerjoin(
                DocumentAspectORM,
                (DocumentAspectORM.sdoc_id == SourceDocumentDataORM.id)
                & (DocumentAspectORM.aspect_id == aspect_id),
            )
            .filter(
                DocumentAspectORM.sdoc_id.is_(None),
                DocumentAspectORM.aspect_id.is_(None),
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.doctype == DocType.text,
            )
            .all()
        )

    def remove(self, db: Session, *, id: int) -> SourceDocumentORM:
        sdoc_db_obj = super().remove(db=db, id=id)

        # remove file from repo
        RepoService().remove_sdoc_file(
            sdoc=SourceDocumentRead.model_validate(sdoc_db_obj)
        )

        # remove from elasticsearch
        ElasticSearchService().delete_document_from_index(
            sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
        )

        # remove from index
        with WeaviateService().weaviate_session() as client:
            crud_aspect_embedding.remove_by_sdoc_id(
                client=client, project_id=sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
            )
            crud_document_embedding.remove_by_sdoc_id(
                client=client, project_id=sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
            )
            crud_image_embedding.remove_by_sdoc_id(
                client=client, project_id=sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
            )
            crud_sentence_embedding.remove_by_sdoc_id(
                client=client, project_id=sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
            )

        return sdoc_db_obj

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
                SourceDocumentLinkORM.linked_source_document_id.is_not(None),
            )
        )
        query = query.order_by(desc(SourceDocumentLinkORM.parent_source_document_id))

        res = query.all()
        return [
            linked_sdoc_id if parent_sdoc_id == sdoc_id else parent_sdoc_id
            for (parent_sdoc_id, linked_sdoc_id) in res
            if linked_sdoc_id is not None
        ]

    def read_all_without_tags(
        self, db: Session, *, project_id: int, tag_ids: List[int] = []
    ) -> List[SourceDocumentORM]:
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id)
            .outerjoin(SourceDocumentORM.document_tags)
            .filter(
                SourceDocumentORM.document_tags == None  # noqa: E711
                if len(tag_ids) == 0
                else DocumentTagORM.id.notin_(tag_ids)
            )
            .all()
        )

    def read_all_with_tags(
        self, db: Session, *, project_id: int, tag_ids: List[int] = []
    ) -> List[SourceDocumentORM]:
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id)
            .join(SourceDocumentORM.document_tags)
            .filter(
                SourceDocumentORM.document_tags != None  # noqa: E711
                if len(tag_ids) == 0
                else DocumentTagORM.id.in_(tag_ids)
            )
            .all()
        )

    def get_annotators(
        self, db: Session, *, sdoc_ids: List[int]
    ) -> Dict[int, List[int]]:
        user_ids_agg = aggregate_ids(AnnotationDocumentORM.user_id, label="user_ids")
        rows = (
            db.query(SourceDocumentORM.id, user_ids_agg)
            .join(
                SourceDocumentORM.annotation_documents,
                isouter=True,
            )
            .filter(SourceDocumentORM.id.in_(sdoc_ids))
            .group_by(SourceDocumentORM.id)
            .all()
        )
        return {row[0]: row[1] for row in rows}

    def get_tags(self, db: Session, *, sdoc_ids: List[int]) -> Dict[int, List[int]]:
        tag_ids_agg = aggregate_ids(DocumentTagORM.id, label="tag_ids")
        rows = (
            db.query(SourceDocumentORM.id, tag_ids_agg)
            .join(
                SourceDocumentORM.document_tags,
                isouter=True,
            )
            .filter(SourceDocumentORM.id.in_(sdoc_ids))
            .group_by(SourceDocumentORM.id)
            .all()
        )
        return {row[0]: row[1] for row in rows}


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
