from collections import defaultdict

from sqlalchemy import CursorResult, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from core.tag.tag_dto import TagCreate, TagUpdate
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDTag(ProjectCRUDBase[TagORM, TagCreate, TagUpdate]):
    ### CREATE OPERATIONS ###
    # Inherited from ProjectCRUDBase

    ### READ OPERATIONS ###

    def read_by_project(
        self, db: Session, *, project_id: int, sdoc_id: int | None = None
    ) -> list[TagORM]:
        """
        Read the tags of the project, optionally only those of a document.

        Args:
            project_id: The project of the tags.
            sdoc_id: Only the tags linked with this document of the project.

        Returns:
            The matching tags, ordered by id.
        """
        query = db.query(self.model).filter(self.model.project_id == project_id)
        if sdoc_id is not None:
            query = query.join(
                SourceDocumentTagLinkTable,
                (SourceDocumentTagLinkTable.project_id == self.model.project_id)
                & (SourceDocumentTagLinkTable.tag_id == self.model.id),
            ).filter(SourceDocumentTagLinkTable.source_document_id == sdoc_id)
        return query.order_by(self.model.id).all()

    def read_by_name_and_project(
        self, db: Session, *, name: str, project_id: int
    ) -> TagORM | None:
        return (
            db.query(TagORM)
            .filter(TagORM.name == name, TagORM.project_id == project_id)
            .first()
        )

    def read_by_names(
        self,
        db: Session,
        *,
        project_id: int,
        names: list[str],
    ) -> list[TagORM]:
        if not names:
            return []

        db_objs: list[TagORM] = []
        for i in range(0, len(names), BATCH_SIZE):
            batch_names = names[i : i + BATCH_SIZE]
            db_objs.extend(
                db.query(TagORM)
                .filter(TagORM.name.in_(batch_names), TagORM.project_id == project_id)
                .order_by(TagORM.id)
                .all()
            )
        return db_objs

    def read_tags_for_documents(
        self, db: Session, *, project_id: int, sdoc_ids: list[int]
    ) -> dict[int, list[TagORM]]:
        """
        Read the tags of documents of the project.

        Args:
            project_id: The project of the documents.
            sdoc_ids: The documents.

        Returns:
            The tags per document id; documents without tags have no entry.
        """
        if not sdoc_ids:
            return {}

        result: dict[int, list[TagORM]] = defaultdict(list)
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]
            stmt = (
                select(SourceDocumentTagLinkTable.source_document_id, TagORM)
                .join_from(
                    SourceDocumentTagLinkTable,
                    TagORM,
                    (SourceDocumentTagLinkTable.project_id == TagORM.project_id)
                    & (SourceDocumentTagLinkTable.tag_id == TagORM.id),
                )
                .where(
                    SourceDocumentTagLinkTable.project_id == project_id,
                    SourceDocumentTagLinkTable.source_document_id.in_(batch_ids),
                )
            )
            for sdoc_id, tag_obj in db.execute(stmt).all():
                result[sdoc_id].append(tag_obj)

        return dict(result)

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        project_id: int,
        ids: list[int],
        update_dtos: list[TagUpdate],
    ) -> list[TagORM]:
        # check that no parent tag is being set to the tag itself
        for id, update_dto in zip(ids, update_dtos):
            if update_dto.parent_id == id:
                raise ValueError("A tag cannot be its own parent")

        return super().update_multi(
            db=db, project_id=project_id, ids=ids, update_dtos=update_dtos
        )

    ### OTHER OPERATIONS ###

    def count_by_sdocs(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_ids: list[int],
        tag_ids: list[int] | None = None,
    ) -> dict[int, int]:
        """
        Count per tag how many of the documents carry it.

        Args:
            project_id: The project of the tags and documents.
            sdoc_ids: The documents to count.
            tag_ids: The tags to count; all tags of the project if None.

        Returns:
            The number of documents per tag id, 0 for a tag no document carries.
            A tag id of another project is counted as 0.
        """
        if tag_ids is None:
            tag_ids = [
                tag.id for tag in self.read_by_project(db=db, project_id=project_id)
            ]
        results: dict[int, int] = {tag_id: 0 for tag_id in tag_ids}
        if not tag_ids or not sdoc_ids:
            return results

        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]
            stmt = (
                select(
                    SourceDocumentTagLinkTable.tag_id,
                    func.count(SourceDocumentTagLinkTable.tag_id),
                )
                .where(
                    SourceDocumentTagLinkTable.project_id == project_id,
                    SourceDocumentTagLinkTable.source_document_id.in_(batch_ids),
                    SourceDocumentTagLinkTable.tag_id.in_(tag_ids),
                )
                .group_by(SourceDocumentTagLinkTable.tag_id)
            )
            for tag_id, count in db.execute(stmt).all():
                results[tag_id] += count

        return results

    def link_multiple_tags(
        self, db: Session, *, project_id: int, sdoc_ids: list[int], tag_ids: list[int]
    ) -> int:
        """
        Link every document with every tag. A document or tag of another project
        violates the composite foreign keys of the link table.

        Args:
            project_id: The project of the documents and tags.
            sdoc_ids: The documents.
            tag_ids: The tags.

        Returns:
            The number of new links.
        """
        if not sdoc_ids or not tag_ids:
            return 0

        insert_values = [
            {"project_id": project_id, "source_document_id": sdoc_id, "tag_id": tag_id}
            for sdoc_id in sdoc_ids
            for tag_id in tag_ids
        ]
        insert_stmt = (
            insert(SourceDocumentTagLinkTable)
            .on_conflict_do_nothing()
            .returning(SourceDocumentTagLinkTable.source_document_id)
        )
        new_rows = db.execute(insert_stmt, insert_values).fetchall()
        db.flush()

        return len(new_rows)

    def unlink_multiple_tags(
        self, db: Session, *, project_id: int, sdoc_ids: list[int], tag_ids: list[int]
    ) -> int:
        """
        Unlink the tags from the documents of the project.

        Args:
            project_id: The project of the documents and tags.
            sdoc_ids: The documents.
            tag_ids: The tags.

        Returns:
            The number of removed links.
        """
        if not sdoc_ids or not tag_ids:
            return 0

        total_deleted_count = 0
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            stmt = delete(SourceDocumentTagLinkTable).where(
                SourceDocumentTagLinkTable.project_id == project_id,
                SourceDocumentTagLinkTable.source_document_id.in_(batch_sdoc_ids),
                SourceDocumentTagLinkTable.tag_id.in_(tag_ids),
            )
            result = db.execute(stmt)
            assert isinstance(result, CursorResult), "Expected a CursorResult!"
            total_deleted_count += result.rowcount

        db.flush()
        return total_deleted_count

    def set_tags_batch(
        self, db: Session, *, project_id: int, links: dict[int, list[int]]
    ) -> int:
        """
        Link and unlink tags so that every document has exactly its given tags.

        Args:
            project_id: The project of the documents and tags.
            links: The tag ids per document id.

        Returns:
            The number of added and removed links.
        """
        current = self.read_tags_for_documents(
            db=db, project_id=project_id, sdoc_ids=list(links)
        )
        modifications = 0
        for sdoc_id, tag_ids in links.items():
            current_tag_ids = {tag.id for tag in current.get(sdoc_id, [])}
            modifications += self.unlink_multiple_tags(
                db,
                project_id=project_id,
                sdoc_ids=[sdoc_id],
                tag_ids=list(current_tag_ids - set(tag_ids)),
            )
            modifications += self.link_multiple_tags(
                db,
                project_id=project_id,
                sdoc_ids=[sdoc_id],
                tag_ids=list(set(tag_ids) - current_tag_ids),
            )
        return modifications


crud_tag = CRUDTag(TagORM)
