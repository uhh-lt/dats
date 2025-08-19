from typing import Iterable

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_dto import TagCreate, TagUpdate
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from repos.db.crud_base import CRUDBase


class CRUDTag(CRUDBase[TagORM, TagCreate, TagUpdate]):
    ### READ OPERATIONS ###

    def read_by_name_and_project(
        self, db: Session, name: str, project_id: int
    ) -> TagORM | None:
        return (
            db.query(self.model)
            .filter(self.model.name == name, self.model.project_id == project_id)
            .first()
        )

    # Return a dictionary in the following format:
    # tag id => count of documents that have this tag
    # for all tags in the database
    def read_tag_sdoc_counts(self, db: Session, sdoc_ids: list[int]) -> dict[int, int]:
        # Get the source documents matching the `sdoc_ids` parameter
        # and count how many of them have each tag
        sdocs_query = (
            select(TagORM.id, func.count(SourceDocumentORM.id).label("count"))
            .join(TagORM.source_documents)
            .filter(SourceDocumentORM.id.in_(sdoc_ids))
            .group_by(TagORM.id)
            .subquery()
        )

        # Get *all* tags in the database and join the matching sdoc count from the subquery,
        # using 0 as a default instead of `NULL`
        query = select(TagORM.id, func.coalesce(sdocs_query.c.count, 0)).join_from(
            TagORM,
            sdocs_query,
            TagORM.id == sdocs_query.c.id,
            isouter=True,
        )
        rows = db.execute(query)

        return dict((tag_id, count) for tag_id, count in rows)

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
        if not sdoc_ids:
            return {}

        # Query to get all tags linked to the provided sdoc_ids
        query = (
            db.query(
                SourceDocumentTagLinkTable.source_document_id,
                TagORM.id,
                TagORM.name,
            )
            .join(
                TagORM,
                SourceDocumentTagLinkTable.tag_id == TagORM.id,
            )
            .filter(SourceDocumentTagLinkTable.source_document_id.in_(sdoc_ids))
            .all()
        )

        # Organize results into a dictionary {sdoc_id: [tag1, tag2, ...]}
        result: dict[int, list[TagORM]] = {}
        for sdoc_id, tag_id, tag_name in query:
            tag = TagORM(id=tag_id, name=tag_name)
            if sdoc_id not in result:
                result[sdoc_id] = []
            result[sdoc_id].append(tag)

        return result

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
                db.query(self.model)
                .filter(
                    self.model.project_id == project_id,
                    self.model.parent_id == parent_id,
                    self.model.name == tag_name,
                )
                .first()
                is not None
            )
        else:
            return (
                db.query(self.model)
                .filter(
                    self.model.project_id == project_id, self.model.name == tag_name
                )
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
        Unlinks all DocTags with all SDocs
        """
        if len(sdoc_ids) == 0 or len(tag_ids) == 0:
            return 0

        # remove links (sdoc <-> tag)
        del_rows = db.execute(
            delete(SourceDocumentTagLinkTable)
            .where(
                SourceDocumentTagLinkTable.source_document_id.in_(sdoc_ids),
                SourceDocumentTagLinkTable.tag_id.in_(tag_ids),
            )
            .returning(SourceDocumentTagLinkTable.source_document_id)
        ).fetchall()
        db.commit()

        return len(del_rows)

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


crud_tag = CRUDTag(TagORM)
