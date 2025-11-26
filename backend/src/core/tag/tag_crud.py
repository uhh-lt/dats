from collections import defaultdict
from typing import Iterable

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from config import conf
from core.tag.tag_dto import TagCreate, TagUpdate
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from repos.db.crud_base import CRUDBase

BATCH_SIZE = conf.postgres.batch_size


class CRUDTag(CRUDBase[TagORM, TagCreate, TagUpdate]):
    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, project_id: int) -> list[TagORM]:
        return db.query(TagORM).filter(TagORM.project_id == project_id).all()

    def read_by_name_and_project(
        self, db: Session, name: str, project_id: int
    ) -> TagORM | None:
        return (
            db.query(TagORM)
            .filter(TagORM.name == name, TagORM.project_id == project_id)
            .first()
        )

    def read_by_names(
        self,
        db: Session,
        project_id: int,
        names: list[str],
    ) -> list[TagORM]:
        return (
            db.query(TagORM)
            .filter(TagORM.name.in_(names), TagORM.project_id == project_id)
            .all()
        )

    # for all tags in the project
    def read_tag_sdoc_counts(
        self, db: Session, project_id: int, sdoc_ids: list[int]
    ) -> dict[int, int]:
        """
        Counts how many of the specified source documents (sdoc_ids) have each tag in the project.
        Args:
            db (Session): The current database session used for querying.
            project_id (int): The project ID to filter tags.
            sdoc_ids (list[int]): A list of source document IDs to consider for counting.

        Returns:
            dict[int, int]: A dictionary mapping each tag ID to the count of source documents
                            (from sdoc_ids) that have that tag.
        """
        # 1. Get ALL tag IDs that exist in the project
        all_tag_ids = [
            tag.id for tag in self.read_by_project(db=db, project_id=project_id)
        ]

        # Initialize the results dictionary with all tags having a count of 0
        results: dict[int, int] = {tag_id: 0 for tag_id in all_tag_ids}

        if not sdoc_ids:
            return results

        # 2. Process sdoc_ids in Batches
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 3. Build the SELECT statement for the current batch
            stmt = (
                select(
                    SourceDocumentTagLinkTable.tag_id,
                    func.count(SourceDocumentTagLinkTable.tag_id),
                )
                .where(
                    SourceDocumentTagLinkTable.source_document_id.in_(batch_ids),
                    SourceDocumentTagLinkTable.tag_id.in_(all_tag_ids),
                )
                .group_by(SourceDocumentTagLinkTable.tag_id)
            )

            # 4. Execute the statement and fetch the results for the batch
            batch_rows = db.execute(stmt).all()

            # 5. Aggregate the counts
            for tag_id, count in batch_rows:
                results[tag_id] += count

        return results

    def read_tags_for_documents(
        self, db: Session, *, sdoc_ids: Iterable[int]
    ) -> dict[int, list[TagORM]]:
        """
        Retrieves all tags associated with the given list of document IDs.

        Args:
            db (Session): The current database session used for querying.
            sdoc_ids (Iterable[int]): A list of document IDs for which to retrieve tags.

        Returns:
            dict[int, list[TagORM]]: A dictionary mapping each document ID to a list of associated tags.
        """
        sdoc_id_list = list(sdoc_ids)
        if not sdoc_id_list:
            return {}

        # result aggregation
        result: dict[int, list[TagORM]] = defaultdict(list)

        # 1. Process in Batches
        for i in range(0, len(sdoc_id_list), BATCH_SIZE):
            batch_ids = sdoc_id_list[i : i + BATCH_SIZE]

            # 2. Build the 2.0 SELECT Statement
            stmt = (
                select(SourceDocumentTagLinkTable.source_document_id, TagORM)
                .join_from(
                    SourceDocumentTagLinkTable,
                    TagORM,
                    SourceDocumentTagLinkTable.tag_id == TagORM.id,
                )
                .filter(SourceDocumentTagLinkTable.source_document_id.in_(batch_ids))
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the results
            for sdoc_id, tag_obj in batch_rows:
                result[sdoc_id].append(tag_obj)

        return dict(result)

    ### UPDATE OPERATIONS ###

    def update(self, db: Session, *, id: int, update_dto: TagUpdate) -> TagORM:
        # check that the parent tag is not being set to itself
        if update_dto.parent_id == id:
            raise ValueError("A tag cannot be its own parent")

        return super().update(db, id=id, update_dto=update_dto)

    ### OTHER OPERATIONS ###

    def exists_by_project_and_tag_name_and_parent_id(
        self, db: Session, tag_name: str, project_id: int, parent_id: int | None
    ) -> bool:
        if parent_id:
            return (
                db.query(TagORM)
                .filter(
                    TagORM.project_id == project_id,
                    TagORM.parent_id == parent_id,
                    TagORM.name == tag_name,
                )
                .first()
                is not None
            )
        else:
            return (
                db.query(TagORM)
                .filter(TagORM.project_id == project_id, TagORM.name == tag_name)
                .first()
                is not None
            )

    def link_multiple_tags(
        self, db: Session, *, sdoc_ids: list[int], tag_ids: list[int]
    ) -> int:
        """
        Links all SDocs with all DocTags
        """
        if len(sdoc_ids) == 0 or len(tag_ids) == 0:
            return 0

        # insert links (sdoc <-> tag)
        from sqlalchemy.dialects.postgresql import insert

        insert_values = [
            {"source_document_id": str(sdoc_id), "tag_id": str(tag_id)}
            for sdoc_id in sdoc_ids
            for tag_id in tag_ids
        ]

        insert_stmt = (
            insert(SourceDocumentTagLinkTable)
            .on_conflict_do_nothing()
            .returning(SourceDocumentTagLinkTable.source_document_id)
        )

        new_rows = db.execute(insert_stmt, insert_values).fetchall()
        db.commit()

        return len(new_rows)

    def unlink_multiple_tags(
        self, db: Session, *, sdoc_ids: list[int], tag_ids: list[int]
    ) -> int:
        """
        Unlinks specified tags from specified source documents, using batched deletion.
        Returns the total count of rows deleted.
        """
        if not sdoc_ids or not tag_ids:
            return 0

        total_deleted_count = 0

        # 1. Process sdoc_ids in Batches
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 2. Build the DELETE Statement
            stmt = delete(SourceDocumentTagLinkTable).where(
                SourceDocumentTagLinkTable.source_document_id.in_(batch_sdoc_ids),
                SourceDocumentTagLinkTable.tag_id.in_(tag_ids),
            )

            # 3. Execute the statement
            result = db.execute(stmt)

            # Add the count of deleted rows from this batch
            total_deleted_count += result.rowcount

        # 4. Commit all batched deletions
        db.commit()

        return total_deleted_count

    def set_tags(self, db: Session, *, sdoc_id: int, tag_ids: list[int]) -> int:
        """
        Link/Unlink DocTags so that sdoc has exactly the tags
        """
        # current state
        from core.doc.source_document_crud import crud_sdoc

        current_tag_ids = [tag.id for tag in crud_sdoc.read(db, id=sdoc_id).tags]

        # find tags to be added and removed
        add_tag_ids = list(set(tag_ids) - set(current_tag_ids))
        del_tag_ids = list(set(current_tag_ids) - set(tag_ids))

        modifications = self.unlink_multiple_tags(
            db, sdoc_ids=[sdoc_id], tag_ids=del_tag_ids
        )
        modifications += self.link_multiple_tags(
            db, sdoc_ids=[sdoc_id], tag_ids=add_tag_ids
        )

        return modifications

    def set_tags_batch(self, db: Session, *, links: dict[int, list[int]]) -> int:
        modifications = 0
        for sdoc_id, tag_ids in links.items():
            modifications += self.set_tags(db, sdoc_id=sdoc_id, tag_ids=tag_ids)
        return modifications

    def count_by_tags_and_sdocs_and_user(
        self,
        db: Session,
        *,
        tag_ids: list[int],
        sdoc_ids: list[int],
        user_id: int,
    ) -> dict[int, int]:
        # Initialize the results dictionary: {tag_id: 0} for all input tags
        results: dict[int, int] = {tag_id: 0 for tag_id in tag_ids}

        if not tag_ids or not sdoc_ids:
            return results

        # 1. Process sdoc_ids in Batches
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 2. Build the SELECT Statement
            stmt = (
                select(
                    SourceDocumentTagLinkTable.tag_id,
                    func.count(SourceDocumentTagLinkTable.tag_id),
                )
                .where(
                    SourceDocumentTagLinkTable.tag_id.in_(tag_ids),
                    SourceDocumentTagLinkTable.source_document_id.in_(batch_sdoc_ids),
                )
                .group_by(SourceDocumentTagLinkTable.tag_id)
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the counts
            for tag_id, count in batch_rows:
                results[tag_id] += count

        return results


crud_tag = CRUDTag(TagORM)
