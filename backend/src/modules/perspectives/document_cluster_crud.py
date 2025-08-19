from fastapi.encoders import jsonable_encoder
from sqlalchemy import tuple_, update
from sqlalchemy.orm import Session

from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_cluster_dto import (
    DocumentClusterCreate,
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from repos.db.crud_base import CRUDBase, NoSuchElementError


class CRUDDocumentCluster(
    CRUDBase[DocumentClusterORM, DocumentClusterCreate, DocumentClusterUpdate]
):
    ### READ OPERATIONS ###

    def read(self, db: Session, id: tuple[int, int]) -> DocumentClusterORM:
        """
        Read a DocumentClusterORM by a tuple of (sdoc_id, cluster_id).
        """

        db_obj = (
            db.query(self.model)
            .filter(
                self.model.sdoc_id == id[0],
                self.model.cluster_id == id[1],
            )
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, sdoc_id=id[0], cluster_id=id[1])
        return db_obj

    def read_by_ids(
        self, db: Session, ids: list[tuple[int, int]]
    ) -> list[DocumentClusterORM]:
        """
        Read DocumentClusterORMs by a list of (sdoc_id, cluster_id) tuples.
        """
        if not ids:
            return []
        return (
            db.query(self.model)
            .filter(tuple_(self.model.sdoc_id, self.model.cluster_id).in_(ids))
            .all()
        )

    def read_by_aspect_id(
        self, db: Session, *, aspect_id: int
    ) -> list[DocumentClusterORM]:
        return (
            db.query(self.model)
            .join(ClusterORM, ClusterORM.id == self.model.cluster_id)
            .filter(ClusterORM.aspect_id == aspect_id)
            .all()
        )

    def read_by_aspect_and_cluster_id(
        self, db: Session, *, aspect_id: int, cluster_id: int
    ) -> list[DocumentClusterORM]:
        return (
            db.query(self.model)
            .join(ClusterORM, ClusterORM.id == self.model.cluster_id)
            .filter(
                ClusterORM.aspect_id == aspect_id, self.model.cluster_id == cluster_id
            )
            .all()
        )

    ### UPDATE OPERATIONS ###

    def update(
        self,
        db: Session,
        *,
        id: tuple[int, int],
        sdoc_id: int,
        cluster_id: int,
        update_dto: DocumentClusterUpdate,
    ) -> DocumentClusterORM:
        """
        Update a DocumentClusterORM by a tuple of (sdoc_id, cluster_id) and an update DTO.
        """
        db_obj = self.read(db=db, id=id)

        obj_data = jsonable_encoder(db_obj.as_dict())
        update_data = update_dto.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentClusterUpdate],
    ) -> list[DocumentClusterORM]:
        """
        Update multiple DocumentClusterORMs by a list of (sdoc_id, cluster_id) tuples and corresponding update DTOs.
        """
        if len(ids) != len(update_dtos):
            raise ValueError(
                f"The number of IDs and Update DTO objects must equal! {len(ids)} IDs and {len(update_dtos)} Update DTOs received."
            )
        db_objects = self.read_by_ids(db, ids)

        for db_obj, update_dto in zip(db_objects, update_dtos):
            obj_data = jsonable_encoder(db_obj.as_dict())
            update_data = update_dto.model_dump(exclude_unset=True)
            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])
        db.add_all(db_objects)
        db.commit()
        return db_objects

    ### OTHER OPERATIONS ###

    def merge_clusters(
        self,
        db: Session,
        *,
        cluster_to_keep: int,
        cluster_to_merge: int,
    ) -> None:
        """
        Merge two clusters by updating the cluster_id of all DocumentClusterORM entries
        that belong to the cluster being merged into the cluster that is kept.
        Args:
            db: The database session
            cluster_to_keep: The ID of the cluster that will be kept
            cluster_to_merge: The ID of the cluster that will be merged into the kept cluster
        Raises:
            NoSuchElementError: If the cluster to merge does not exist
            IntegrityError: If the merge operation violates database constraints
        """
        # No actual merge operation needed.
        if cluster_to_keep == cluster_to_merge:
            return

        # Update all DocumentClusterORM entries that reference the cluster to merge
        stmt = (
            update(self.model)
            .where(self.model.cluster_id == cluster_to_merge)
            .values(cluster_id=cluster_to_keep)
            .execution_options(
                synchronize_session=False
            )  # Recommended for bulk updates
        )

        try:
            db.execute(stmt)
            db.commit()
        except Exception:
            db.rollback()
            raise  # Re-raise the database exception (e.g., IntegrityError)

    def set_labels(
        self,
        db: Session,
        *,
        aspect_id: int,
        sdoc_ids: list[int],
        is_accepted: bool,
    ) -> int:
        """
        Accepts the labels for the provided SourceDocuments (by ID) of the aspect.
        Args:
            db: The database session
            aspect_id: The ID of the aspect to which the cluster belongs
            sdoc_ids: List of SourceDocument IDs to accept labels for
            is_accepted: Whether to set the labels as accepted
        Returns:
            The number of DocumentClusterORM objects that were updated
        """
        if not sdoc_ids:
            return 0

        stmt = (
            update(self.model)
            .where(
                self.model.sdoc_id.in_(sdoc_ids),
                self.model.cluster_id == ClusterORM.id,
                ClusterORM.aspect_id == aspect_id,
            )
            .values(is_accepted=is_accepted)
            .execution_options(synchronize_session=False)
        )
        results = db.execute(stmt)
        db.commit()

        return results.rowcount if results.rowcount is not None else 0

    def set_labels2(
        self,
        db: Session,
        *,
        aspect_id: int,
        cluster_id: int,
        sdoc_ids: list[int],
        is_accepted: bool,
    ) -> int:
        """
        Sets the Cluster <-> SourceDocument assignments to the provided Cluster.
        Args:
            db: The database session
            aspect_id: The ID of the aspect to which the cluster belongs
            cluster_id: The ID of the cluster to which the SourceDocuments should be assigned
            sdoc_ids: List of SourceDocument IDs to set cluster for
            is_accepted: Whether to set the labels as accepted
        Returns:
            The number of DocumentClusterORM objects that were updated
        """
        if not sdoc_ids:
            return 0

        stmt = (
            update(self.model)
            .where(
                self.model.sdoc_id.in_(sdoc_ids),
                self.model.cluster_id == ClusterORM.id,
                ClusterORM.aspect_id == aspect_id,
            )
            .values(cluster_id=cluster_id, is_accepted=is_accepted)
            .execution_options(synchronize_session=False)
        )
        results = db.execute(stmt)
        db.commit()

        return results.rowcount if results.rowcount is not None else 0


crud_document_cluster = CRUDDocumentCluster(DocumentClusterORM)
