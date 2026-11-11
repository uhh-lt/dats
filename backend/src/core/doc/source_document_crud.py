from sqlalchemy import case, func, or_, select, update
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
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
from core.tag.tag_orm import TagORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase
from repos.db.sql_utils import aggregate_ids


class CRUDSourceDocument(
    SQLCRUDBase[SourceDocumentORM, SourceDocumentCreate, SourceDocumentUpdate]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[SourceDocumentCreate]
    ) -> list[SourceDocumentORM]:
        # Documents without folder_id get a folder with the same name as the document
        without_folder = [dto for dto in create_dtos if dto.folder_id is None]
        folders = crud_folder.create_multi(
            db=db,
            create_dtos=[
                FolderCreate(
                    name=dto.filename,
                    folder_type=FolderType.SDOC_FOLDER,
                    project_id=dto.project_id,
                )
                for dto in without_folder
            ],
        )
        folder_id_by_dto = {
            id(dto): folder.id for dto, folder in zip(without_folder, folders)
        }

        return super().create_multi(
            db=db,
            create_dtos=[
                dto.model_copy(update={"folder_id": folder_id_by_dto[id(dto)]})
                if dto.folder_id is None
                else dto
                for dto in create_dtos
            ],
        )

    ### READ OPERATIONS ###

    def read_status(
        self, db: Session, *, sdoc_id: int, raise_error_on_unfinished: bool = False
    ) -> SDocStatus:
        status = SDocStatus(self.read(db=db, id=sdoc_id).processed_status)
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
                self.model.processed_status == status.value,
            )
            .all()
        )

    def read_by_project_and_tag(
        self,
        db: Session,
        *,
        project_id: int,
        tag_id: int,
        only_finished: bool = True,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentORM]:
        query = db.query(self.model).join(SourceDocumentORM, TagORM.source_documents)
        if only_finished:
            query = query.filter(
                self.model.project_id == project_id,
                self.model.processed_status == SDocStatus.finished.value,
                TagORM.id == tag_id,
            )
        else:
            query = query.filter(
                self.model.project_id == project_id, TagORM.id == tag_id
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
        project_id: int,
        only_finished: bool = True,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == project_id,
                self.model.processed_status == SDocStatus.finished.value,
            )
        else:
            query = query.filter(self.model.project_id == project_id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def read_by_name(
        self, db: Session, *, name: str, project_id: int
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
                self.model.processed_status == SDocStatus.finished.value,
            )
        else:
            query = query.filter(
                self.model.project_id == project_id, self.model.filename == filename
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

    def read_ids_by_folder_ids(
        self, db: Session, *, folder_ids: list[int]
    ) -> list[int]:
        """IDs of all SourceDocuments directly inside the given folders."""
        if not folder_ids:
            return []
        return [
            row[0]
            for row in db.query(self.model.id)
            .filter(self.model.folder_id.in_(folder_ids))
            .all()
        ]

    ### UPDATE OPERATIONS ###

    def update_pending_steps_to_erroneous(
        self, db: Session, *, sdoc_id: int, steps: list[JobType]
    ) -> None:
        """Set the given steps of the document that are pending (processing) to
        erroneous; steps with another status or not planned keep it."""
        if not steps:
            return
        processing = SDocStatus.processing.value
        erroneous = SDocStatus.erroneous.value
        columns = [getattr(self.model, s.value) for s in steps]
        db.execute(
            update(self.model)
            .where(self.model.id == sdoc_id)
            .values(
                {c.key: case((c == processing, erroneous), else_=c) for c in columns}
            )
            .execution_options(synchronize_session=False)
        )

    def update_pending_steps_to_not_planned(
        self, db: Session, *, project_id: int, doctype: DocType, steps: list[JobType]
    ) -> None:
        """
        Set the given steps of the project's documents of this doctype that are
        pending (processing) to not planned (NULL); steps with another status
        keep it.

        Args:
            project_id: The project of the documents.
            doctype: The doctype of the documents.
            steps: The steps to unplan.
        """
        if not steps:
            return
        processing = SDocStatus.processing.value
        columns = [getattr(self.model, s.value) for s in steps]
        db.execute(
            update(self.model)
            .where(
                self.model.project_id == project_id,
                self.model.doctype == doctype,
                or_(*[c == processing for c in columns]),
            )
            .values({c.key: case((c == processing, None), else_=c) for c in columns})
            .execution_options(synchronize_session=False)
        )

    ### DELETE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### OTHER OPERATIONS ###

    def count_by_project_and_status(
        self, db: Session, *, project_id: int, status: SDocStatus | None = None
    ) -> int:
        query = db.query(self.model)
        if status is not None:
            query = query.filter(
                self.model.project_id == project_id,
                self.model.processed_status == status.value,
            )
        else:
            query = query.filter(self.model.project_id == project_id)
        return query.with_entities(func.count()).scalar()


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
