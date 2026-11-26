from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreateIntern,
    SentenceAnnotationUpdate,
)
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_orm import CodeORM
from core.memo.object_handle_orm import ObjectHandleORM
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDSentenceAnnotation(
    ProjectCRUDBase[
        SentenceAnnotationORM, SentenceAnnotationCreateIntern, SentenceAnnotationUpdate
    ]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        project_id: int,
        create_dtos: list[SentenceAnnotationCreateIntern],
    ) -> list[SentenceAnnotationORM]:
        db_objs = super().create_multi(
            db=db, project_id=project_id, create_dtos=create_dtos
        )

        # update all affected annotation documents' timestamp
        adoc_ids = list(
            {create_dto.annotation_document_id for create_dto in create_dtos}
        )
        crud_adoc.update_timestamps(db=db, project_id=project_id, ids=adoc_ids)

        return db_objs

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
    ) -> list[SentenceAnnotationORM]:
        return (
            db.query(self.model)
            .options(*self._load_options())
            .where(self.model.project_id == project_id)
            .all()
        )

    def read_by_project_and_uuid(
        self,
        db: Session,
        *,
        project_id: int,
        uuid: str,
    ) -> SentenceAnnotationORM | None:
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .where(
                self.model.project_id == project_id,
                self.model.uuid == uuid,
            )
        )
        return query.first()

    def read_by_project_and_uuids(
        self, db: Session, *, project_id: int, uuids: list[str]
    ) -> list[SentenceAnnotationORM]:
        """
        Read the annotations of a project with the given uuids, in batches of
        `BATCH_SIZE`.

        Args:
            project_id: The project of the annotations.
            uuids: The uuids to read. Missing uuids are no error.

        Returns:
            The existing annotations, in no particular order.
        """
        if not uuids:
            return []

        db_objs: list[SentenceAnnotationORM] = []
        for i in range(0, len(uuids), BATCH_SIZE):
            batch_uuids = uuids[i : i + BATCH_SIZE]
            db_objs.extend(
                db.query(self.model)
                .options(*self._load_options())
                .filter(
                    self.model.project_id == project_id,
                    self.model.uuid.in_(batch_uuids),
                )
                .all()
            )
        return db_objs

    def read_by_user(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_id: int | None = None,
        code_id: int | None = None,
        exclude_disabled_codes: bool = True,
    ) -> list[SentenceAnnotationORM]:
        """
        Read the sentence annotations of a user in the project, optionally only
        those in a document or with a code.

        Args:
            project_id: The project of the annotations.
            user_id: The user the annotations belong to.
            sdoc_id: Only the annotations in this document.
            code_id: Only the annotations with this code.
            exclude_disabled_codes: Leave out the annotations with a disabled code.

        Returns:
            The matching annotations.
        """
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .join(self.model.annotation_document)
            .where(
                self.model.project_id == project_id,
                AnnotationDocumentORM.user_id == user_id,
            )
        )
        if sdoc_id is not None:
            query = query.where(AnnotationDocumentORM.source_document_id == sdoc_id)
        if code_id is not None:
            query = query.where(self.model.code_id == code_id)
        if exclude_disabled_codes:
            query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712
        return query.all()

    def read_by_user_sdocs_codes(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_ids: list[int],
        code_ids: list[int],
    ) -> list[SentenceAnnotationORM]:
        if not sdoc_ids or not code_ids:
            return []

        db_objs: list[SentenceAnnotationORM] = []
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model)
                .options(*self._load_options())
                .join(self.model.annotation_document)
                .filter(
                    self.model.project_id == project_id,
                    AnnotationDocumentORM.user_id == user_id,
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    self.model.code_id.in_(code_ids),
                )
            )
            db_objs.extend(query.all())
        return db_objs

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        project_id: int,
        ids: list[int],
        update_dtos: list[SentenceAnnotationUpdate],
    ) -> list[SentenceAnnotationORM]:
        annos = super().update_multi(
            db=db, project_id=project_id, ids=ids, update_dtos=update_dtos
        )

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(
            db=db,
            project_id=project_id,
            ids=list({anno.annotation_document_id for anno in annos}),
        )

        return annos

    ### DELETE OPERATIONS ###

    def delete_multi(self, db: Session, *, project_id: int, ids: list[int]) -> int:
        adoc_ids = self._read_adoc_ids(db=db, project_id=project_id, ids=ids)
        num_deletions = super().delete_multi(db=db, project_id=project_id, ids=ids)

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(db=db, project_id=project_id, ids=adoc_ids)

        return num_deletions

    def delete_by_user_sdocs_codes(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_ids: list[int],
        code_ids: list[int],
    ) -> list[int]:
        if not sdoc_ids or not code_ids:
            return []

        # find all annotations to be removed
        anno_ids: list[int] = []
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model.id)
                .join(self.model.annotation_document)
                .filter(
                    self.model.project_id == project_id,
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    AnnotationDocumentORM.user_id == user_id,
                    self.model.code_id.in_(code_ids),
                )
            )
            anno_ids.extend(row[0] for row in query.all())

        # delete them (updates the annotation documents' timestamp)
        self.delete_multi(db=db, project_id=project_id, ids=anno_ids)

        return anno_ids

    ### OTHER OPERATIONS ###

    def count_by_codes_and_sdocs_and_user(
        self,
        db: Session,
        *,
        project_id: int,
        code_ids: list[int],
        sdoc_ids: list[int],
        user_id: int,
    ) -> dict[int, int]:
        if not code_ids or not sdoc_ids:
            return {}

        results: dict[int, int] = {}
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model.code_id, func.count(self.model.id))
                .join(self.model.annotation_document)
                .where(
                    self.model.project_id == project_id,
                    self.model.code_id.in_(code_ids),
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    AnnotationDocumentORM.user_id == user_id,
                )
                .group_by(self.model.code_id)
            )
            for code_id, count in query.all():
                results[code_id] = results.get(code_id, 0) + count
        return results

    def _load_options(self) -> list[ExecutableOption]:
        # everything the Read DTO reads through ORM properties
        return [
            selectinload(self.model.annotation_document),  # sdoc_id, user_id
            selectinload(self.model.object_handle).selectinload(
                ObjectHandleORM.attached_memos
            ),  # memo_ids
        ]

    def _read_adoc_ids(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> list[int]:
        """Read the distinct annotation document ids of the given annotations."""
        adoc_ids: set[int] = set()
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            adoc_ids.update(
                db.scalars(
                    select(self.model.annotation_document_id).where(
                        self.model.project_id == project_id,
                        self.model.id.in_(batch_ids),
                    )
                )
            )
        return list(adoc_ids)


crud_sentence_anno = CRUDSentenceAnnotation(SentenceAnnotationORM)
