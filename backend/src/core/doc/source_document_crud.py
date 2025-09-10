from fastapi.encoders import jsonable_encoder
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from common.sdoc_status_enum import SDocStatus
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.source_document_data_dto import SourceDocumentDataRead
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_dto import (
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import CRUDBase, NoSuchElementError
from repos.db.sql_utils import aggregate_ids
from repos.filesystem_repo import FilesystemRepo
from systems.event_system.events import source_document_deleted


class SourceDocumentPreprocessingUnfinishedError(Exception):
    def __init__(self, sdoc_id: int):
        super().__init__(f"SourceDocument {sdoc_id} is still getting preprocessed!")


class CRUDSourceDocument(
    CRUDBase[SourceDocumentORM, SourceDocumentCreate, SourceDocumentUpdate]
):
    ### CREATE OPERATIONS ###

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

    ### READ OPERATIONS ###

    def read_status(
        self, db: Session, *, sdoc_id: int, raise_error_on_unfinished: bool = False
    ) -> SDocStatus:
        sdoc = self.read(db=db, id=sdoc_id)
        if sdoc.processed_status != SDocStatus.finished and raise_error_on_unfinished:
            raise SourceDocumentPreprocessingUnfinishedError(sdoc_id=sdoc_id)
        return sdoc.processed_status

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
        self, db: Session, *, ids: list[int]
    ) -> list[SourceDocumentDataORM | None]:
        db_objs = (
            db.query(SourceDocumentDataORM)
            .filter(SourceDocumentDataORM.id.in_(ids))
            .all()
        )
        # create id, data map
        id2data = {db_obj.id: db_obj for db_obj in db_objs}
        return [id2data.get(id) for id in ids]

    def read_by_project_and_status(
        self, db: Session, *, project_id: int, status: SDocStatus
    ) -> list[SourceDocumentORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.processed_status == status.value,
            )
            .all()
        )

    def read_by_project_and_tag(
        self,
        db: Session,
        *,
        proj_id: int,
        tag_id: int,
        only_finished: bool = True,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentORM]:
        query = db.query(self.model).join(SourceDocumentORM, TagORM.source_documents)
        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.processed_status == SDocStatus.finished.value,
                TagORM.id == tag_id,
            )
        else:
            query = query.filter(self.model.project_id == proj_id, TagORM.id == tag_id)

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
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.processed_status == SDocStatus.finished.value,
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
    ) -> SourceDocumentORM | None:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.filename == filename,
                self.model.processed_status == SDocStatus.finished.value,
            )
        else:
            query = query.filter(
                self.model.project_id == proj_id, self.model.filename == filename
            )
        return query.first()

    def read_all_without_tags(
        self, db: Session, *, project_id: int, tag_ids: list[int] = []
    ) -> list[SourceDocumentORM]:
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id)
            .outerjoin(SourceDocumentORM.tags)
            .filter(
                SourceDocumentORM.tags == None  # noqa: E711
                if len(tag_ids) == 0
                else TagORM.id.notin_(tag_ids)
            )
            .all()
        )

    def read_by_tags(
        self, db: Session, *, project_id: int, tag_ids: list[int] = []
    ) -> list[SourceDocumentORM]:
        return (
            db.query(SourceDocumentORM)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.tags.any(TagORM.id.in_(tag_ids)),
            )
            .all()
        )

    def read_annotators(
        self, db: Session, *, sdoc_ids: list[int]
    ) -> dict[int, list[int]]:
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

    def read_tags(self, db: Session, *, sdoc_ids: list[int]) -> dict[int, list[int]]:
        tag_ids_agg = aggregate_ids(TagORM.id, label="tag_ids")
        rows = (
            db.query(SourceDocumentORM.id, tag_ids_agg)
            .join(
                SourceDocumentORM.tags,
                isouter=True,
            )
            .filter(SourceDocumentORM.id.in_(sdoc_ids))
            .group_by(SourceDocumentORM.id)
            .all()
        )
        return {row[0]: row[1] for row in rows}

    ### DELETE OPERATIONS ###

    def delete(self, db: Session, *, id: int) -> SourceDocumentORM:
        sdoc_db_obj = super().delete(db=db, id=id)

        # remove file from filesystem
        FilesystemRepo().remove_sdoc_file(
            sdoc=SourceDocumentRead.model_validate(sdoc_db_obj)
        )

        # emit event
        source_document_deleted.send(
            self, project_id=sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
        )

        return sdoc_db_obj

    ### OTHER OPERATIONS ###

    def count_by_project_and_status(
        self, db: Session, *, proj_id: int, status: SDocStatus | None = None
    ) -> int:
        query = db.query(self.model)
        if status is not None:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.processed_status == status.value,
            )
        else:
            query = query.filter(self.model.project_id == proj_id)
        return query.with_entities(func.count()).scalar()


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
