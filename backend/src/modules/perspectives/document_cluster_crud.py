from sqlalchemy import CursorResult, update
from sqlalchemy.orm import Session

from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_cluster_dto import (
    DocumentClusterCreate,
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDDocumentCluster(
    SQLCRUDBase[
        DocumentClusterORM,
        DocumentClusterCreate,
        DocumentClusterUpdate,
        tuple[int, int],  # (sdoc_id, cluster_id)
    ]
):
    ### READ OPERATIONS ###

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
    # Inherited from SQLCRUDBase

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

        db.execute(stmt)
        db.flush()

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
        total_updated_count = 0

        if not sdoc_ids:
            return total_updated_count

        # 1. Process sdoc_ids in Batches
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 2. Build the UPDATE Statement for the current batch
            stmt = (
                update(self.model)
                .where(
                    self.model.sdoc_id.in_(batch_sdoc_ids),
                )
                .where(
                    self.model.cluster_id == ClusterORM.id,
                    ClusterORM.aspect_id == aspect_id,
                )
                .values(is_accepted=is_accepted)
                .execution_options(synchronize_session=False)
            )

            # 3. Execute the statement
            results = db.execute(stmt)
            assert isinstance(results, CursorResult), "Expected a CursorResult!"

            # Accumulate the count of updated rows from this batch
            count = results.rowcount if results.rowcount is not None else 0
            total_updated_count += count

        # 4. Flush all batched updates
        db.flush()

        return total_updated_count

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
        total_updated_count = 0

        if not sdoc_ids:
            return total_updated_count

        # 1. Process sdoc_ids in Batches
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]

            # 2. Build the UPDATE Statement for the current batch
            stmt = (
                update(self.model)
                .where(
                    self.model.sdoc_id.in_(batch_sdoc_ids),
                )
                .where(
                    self.model.cluster_id == ClusterORM.id,
                    ClusterORM.aspect_id == aspect_id,
                )
                .values(cluster_id=cluster_id, is_accepted=is_accepted)
                .execution_options(synchronize_session=False)
            )

            # 3. Execute the statement
            results = db.execute(stmt)
            assert isinstance(results, CursorResult), "Expected a CursorResult!"

            # Accumulate the count of updated rows from this batch
            count = results.rowcount if results.rowcount is not None else 0
            total_updated_count += count

        # 4. Flush all batched updates
        db.flush()

        return total_updated_count


crud_document_cluster = CRUDDocumentCluster(DocumentClusterORM)
