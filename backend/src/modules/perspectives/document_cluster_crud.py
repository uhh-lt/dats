from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, tuple_, update
from sqlalchemy.orm import Session

from config import conf
from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_cluster_dto import (
    DocumentClusterCreate,
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from repos.db.crud_base import CRUDBase, NoSuchElementError

BATCH_SIZE = conf.postgres.batch_size


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

        db_objects: list[DocumentClusterORM] = []

        # 1. Process the composite key list in batches
        for i in range(0, len(ids), BATCH_SIZE):
            batch_ids = ids[i : i + BATCH_SIZE]

            # 2. Build the SELECT statement
            stmt = select(self.model).filter(
                tuple_(self.model.sdoc_id, self.model.cluster_id).in_(batch_ids)
            )

            # 3. Execute the statement and fetch the results
            batch_objects = db.scalars(stmt).all()
            db_objects.extend(batch_objects)

        # 4. Sort the results to match the input order
        id_map: dict[tuple[int, int], DocumentClusterORM] = {
            (obj.sdoc_id, obj.cluster_id): obj for obj in db_objects
        }
        result: list[DocumentClusterORM] = []
        for key in ids:
            if key in id_map:
                result.append(id_map[key])
            else:
                raise NoSuchElementError(self.model, sdoc_id=key[0], cluster_id=key[1])

        return result

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

            # Accumulate the count of updated rows from this batch
            count = results.rowcount if results.rowcount is not None else 0
            total_updated_count += count

        # 4. Commit all batched updates
        db.commit()

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

            # Accumulate the count of updated rows from this batch
            count = results.rowcount if results.rowcount is not None else 0
            total_updated_count += count

        # 4. Commit all batched updates
        db.commit()

        return total_updated_count


crud_document_cluster = CRUDDocumentCluster(DocumentClusterORM)
