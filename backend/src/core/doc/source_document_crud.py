from fastapi import status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from common.exception_handler import exception_handler
from common.sdoc_status_enum import SDocStatus
from config import conf
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.source_document_dto import (
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import CRUDBase
from repos.db.sql_utils import aggregate_ids
from repos.filesystem_repo import FilesystemRepo
from systems.event_system.events import source_document_deleted

BATCH_SIZE = conf.postgres.batch_size


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
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
        # Pre-check: If the list is empty, return an empty dictionary immediately.
        if not sdoc_ids:
            return {}

        # Dictionary to store the final results: {sdoc_id: [user_ids]}
        results: dict[int, list[int]] = {}

        # 1. Process in Batches
        user_ids_agg = aggregate_ids(AnnotationDocumentORM.user_id, label="user_ids")
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 2. Build SELECT Statement
            stmt = (
                select(self.model.id, user_ids_agg)
                .join(self.model.annotation_documents, isouter=True)
                .filter(self.model.id.in_(batch_ids))
                .group_by(self.model.id)
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the results
            for row in batch_rows:
                results[row[0]] = row[1] if row[1] is not None else []

        return results

    def read_tags(self, db: Session, *, sdoc_ids: list[int]) -> dict[int, list[int]]:
        # Pre-check: If the list is empty, return an empty dictionary immediately.
        if not sdoc_ids:
            return {}

        # Dictionary to store the final results: {sdoc_id: [tag_ids]}
        results: dict[int, list[int]] = {}

        # 1. Process in Batches
        tag_ids_agg = aggregate_ids(TagORM.id, label="tag_ids")
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 2. Build the SELECT Statement
            stmt = (
                select(self.model.id, tag_ids_agg)
                .join(self.model.tags, isouter=True)
                .filter(self.model.id.in_(batch_ids))
                .group_by(self.model.id)
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the results
            for row in batch_rows:
                results[row[0]] = row[1] if row[1] is not None else []

        return results

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
