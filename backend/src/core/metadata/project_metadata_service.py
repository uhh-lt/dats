from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.metadata.metadata_exceptions import ReadOnlyMetadataError
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import (
    ProjectMetadataRead,
    ProjectMetadataUpdate,
    ProjectMetadataUpdateBulk,
)


class ProjectMetadataService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(ProjectMetadataService, cls).__new__(cls)

    def update(
        self, db: Session, *, id: int, update_dto: ProjectMetadataUpdate
    ) -> ProjectMetadataRead:
        """
        Update a user-defined project metadata key.

        Args:
            id: The project metadata to update.
            update_dto: The changes. A new metatype replaces the values of all
                documents with empty values of the new type.

        Returns:
            The updated project metadata.

        Raises:
            ReadOnlyMetadataError: If the project metadata is read-only.
        """
        # 1) only the system may change read-only keys (doc processing fills them by key)
        self._assert_writable(db=db, id=id)

        # 2) update it
        return ProjectMetadataRead.model_validate(
            crud_project_meta.update(db=db, id=id, update_dto=update_dto)
        )

    def update_multi(
        self, db: Session, *, update_dtos: list[ProjectMetadataUpdateBulk]
    ) -> list[ProjectMetadataRead]:
        """
        Update user-defined project metadata keys, each identified by its id.

        Args:
            update_dtos: The changes. Must not repeat an id. A new metatype replaces
                the values of all documents with empty values of the new type.

        Returns:
            The updated project metadata, in the order of `update_dtos`.

        Raises:
            ReadOnlyMetadataError: If any project metadata is read-only.
        """
        ids = [u.project_metadata_id for u in update_dtos]

        # 1) only the system may change read-only keys (doc processing fills them by key)
        read_only = [
            metadata.key
            for metadata in crud_project_meta.read_by_ids(db=db, ids=ids)
            if metadata.read_only
        ]
        if read_only:
            raise ReadOnlyMetadataError(read_only)

        # 2) update them
        crud_project_meta.update_multi(
            db=db,
            ids=ids,
            update_dtos=[
                ProjectMetadataUpdate.model_validate(
                    u.model_dump(exclude_unset=True, exclude={"project_metadata_id"})
                )
                for u in update_dtos
            ],
        )
        return [
            ProjectMetadataRead.model_validate(metadata)
            for metadata in crud_project_meta.read_by_ids(db=db, ids=ids)
        ]

    def delete(self, db: Session, *, id: int) -> ProjectMetadataRead:
        """
        Delete a user-defined project metadata key with the values of all documents.

        Args:
            id: The project metadata to delete.

        Returns:
            The deleted project metadata as it was before the deletion.

        Raises:
            ReadOnlyMetadataError: If the project metadata is read-only.
        """
        # 1) only the system may delete read-only keys (doc processing fills them by key)
        deleted = self._assert_writable(db=db, id=id)

        # 2) delete it
        crud_project_meta.delete(db=db, id=id)

        return deleted

    def _assert_writable(self, db: Session, *, id: int) -> ProjectMetadataRead:
        project_metadata = ProjectMetadataRead.model_validate(
            crud_project_meta.read(db=db, id=id)
        )
        if project_metadata.read_only:
            raise ReadOnlyMetadataError([project_metadata.key])
        return project_metadata
