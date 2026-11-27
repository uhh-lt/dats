from sqlalchemy import func, select
from sqlalchemy.orm import Session

from common.sdoc_status_enum import SDocStatus
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate
from core.doc.folder_enum import FolderType
from core.doc.source_document_dto import (
    SourceDocumentCreate,
    SourceDocumentUpdate,
)
from core.doc.source_document_exceptions import (
    SourceDocumentPreprocessingUnfinishedError,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase
from repos.db.sql_utils import aggregate_ids
from systems.artefact_system.source_document_status_rules import (
    document_status,
    document_status_filter,
)
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)


class CRUDSourceDocument(
    ProjectCRUDBase[SourceDocumentORM, SourceDocumentCreate, SourceDocumentUpdate]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, project_id: int, create_dtos: list[SourceDocumentCreate]
    ) -> list[SourceDocumentORM]:
        # Documents without folder_id get a folder with the same name as the document
        without_folder = [dto for dto in create_dtos if dto.folder_id is None]
        folders = crud_folder.create_multi(
            db=db,
            project_id=project_id,
            create_dtos=[
                FolderCreate(
                    name=dto.filename,
                    folder_type=FolderType.SDOC_FOLDER,
                )
                for dto in without_folder
            ],
        )
        folder_id_by_dto = {
            id(dto): folder.id for dto, folder in zip(without_folder, folders)
        }

        return super().create_multi(
            db=db,
            project_id=project_id,
            create_dtos=[
                dto.model_copy(update={"folder_id": folder_id_by_dto[id(dto)]})
                if dto.folder_id is None
                else dto
                for dto in create_dtos
            ],
        )

    ### READ OPERATIONS ###

    def read_status(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        raise_error_on_unfinished: bool = False,
    ) -> SDocStatus:
        self.exists(db=db, project_id=project_id, id=sdoc_id, raise_error=True)
        status = document_status(
            crud_sdoc_step_status.read_by_sdoc(
                db=db, project_id=project_id, sdoc_id=sdoc_id
            ).values()
        )
        if status != SDocStatus.finished and raise_error_on_unfinished:
            raise SourceDocumentPreprocessingUnfinishedError(sdoc_id=sdoc_id)
        return status

    def read_by_project_and_status(
        self, db: Session, *, project_id: int, status: SDocStatus
    ) -> list[SourceDocumentORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                document_status_filter(status),
            )
            .order_by(self.model.id)
            .all()
        )

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
        only_finished: bool = True,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == project_id,
                document_status_filter(SDocStatus.finished),
            )
        else:
            query = query.filter(self.model.project_id == project_id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def read_by_name(
        self, db: Session, *, project_id: int, name: str
    ) -> SourceDocumentORM | None:
        return (
            db.query(self.model)
            .filter(self.model.name == name, self.model.project_id == project_id)
            .first()
        )

    def read_by_filename(
        self, db: Session, *, project_id: int, only_finished: bool = True, filename: str
    ) -> SourceDocumentORM | None:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == project_id,
                self.model.filename == filename,
                document_status_filter(SDocStatus.finished),
            )
        else:
            query = query.filter(
                self.model.project_id == project_id, self.model.filename == filename
            )
        return query.first()

    def read_all_without_tags(
        self, db: Session, *, project_id: int, tag_ids: list[int] | None
    ) -> list[SourceDocumentORM]:
        """The documents of the project that carry none of the tags, or no tag
        at all if `tag_ids` is None."""
        has_tag = (
            SourceDocumentORM.tags.any()
            if tag_ids is None
            else SourceDocumentORM.tags.any(TagORM.id.in_(tag_ids))
        )
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id, ~has_tag)
            .all()
        )

    def read_by_tags(
        self, db: Session, *, project_id: int, tag_ids: list[int] | None
    ) -> list[SourceDocumentORM]:
        """The documents of the project that carry one of the tags, or any tag
        if `tag_ids` is None."""
        has_tag = (
            SourceDocumentORM.tags.any()
            if tag_ids is None
            else SourceDocumentORM.tags.any(TagORM.id.in_(tag_ids))
        )
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id, has_tag)
            .all()
        )

    def read_annotators(
        self, db: Session, *, project_id: int, sdoc_ids: list[int]
    ) -> dict[int, list[int]]:
        """
        Read the ids of the users who annotated the documents, in batches.

        Args:
            project_id: The project of the documents.
            sdoc_ids: The ids of the documents.

        Returns:
            The user ids by document id. Documents of another project have no entry.
        """
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
                .filter(
                    self.model.project_id == project_id,
                    self.model.id.in_(batch_ids),
                )
                .group_by(self.model.id)
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the results
            for row in batch_rows:
                results[row[0]] = row[1] if row[1] is not None else []

        return results

    def read_tags(
        self, db: Session, *, project_id: int, sdoc_ids: list[int]
    ) -> dict[int, list[int]]:
        """
        Read the ids of the tags of the documents, in batches.

        Args:
            project_id: The project of the documents.
            sdoc_ids: The ids of the documents.

        Returns:
            The tag ids by document id. Documents of another project have no entry.
        """
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
                .filter(
                    self.model.project_id == project_id,
                    self.model.id.in_(batch_ids),
                )
                .group_by(self.model.id)
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the results
            for row in batch_rows:
                results[row[0]] = row[1] if row[1] is not None else []

        return results

    def read_ids_by_folder_ids(
        self, db: Session, *, project_id: int, folder_ids: list[int]
    ) -> list[int]:
        """IDs of all SourceDocuments of the project directly inside the given
        folders."""
        if not folder_ids:
            return []
        return [
            row[0]
            for row in db.query(self.model.id)
            .filter(
                self.model.project_id == project_id,
                self.model.folder_id.in_(folder_ids),
            )
            .all()
        ]

    ### UPDATE OPERATIONS ###
    # Inherited from ProjectCRUDBase (the step statuses: crud_sdoc_step_status)

    ### DELETE OPERATIONS ###
    # Inherited from ProjectCRUDBase

    ### OTHER OPERATIONS ###

    def count_by_project(
        self,
        db: Session,
        *,
        project_id: int,
        status: SDocStatus | None = None,
        date_metadata_id: int | None = None,
    ) -> int:
        """
        Count the documents of the project, optionally filtered.

        Args:
            project_id: The project of the documents.
            status: Only documents with this status.
            date_metadata_id: Only documents with a value for this date metadata.

        Returns:
            The number of matching documents.
        """
        query = db.query(self.model).filter(self.model.project_id == project_id)
        if status is not None:
            query = query.filter(document_status_filter(status))
        if date_metadata_id is not None:
            query = query.filter(
                self.model.metadata_.any(
                    (SourceDocumentMetadataORM.project_metadata_id == date_metadata_id)
                    & SourceDocumentMetadataORM.date_value.isnot(None)
                )
            )
        return query.with_entities(func.count()).scalar()


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
