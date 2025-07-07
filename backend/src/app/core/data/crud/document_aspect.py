from fastapi.encoders import jsonable_encoder
from sqlalchemy import tuple_
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.document_aspect import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from app.core.data.orm.cluster import ClusterORM
from app.core.data.orm.document_aspect import DocumentAspectORM
from app.core.data.orm.document_cluster import DocumentClusterORM


class CRUDDocumentAspect(
    CRUDBase[DocumentAspectORM, DocumentAspectCreate, DocumentAspectUpdate]
):
    def read(self, db: Session, id: tuple[int, int]) -> DocumentAspectORM:
        """
        Read a DocumentAspectORM by a tuple of (sdoc_id, aspect_id).
        """

        db_obj = (
            db.query(self.model)
            .filter(
                self.model.sdoc_id == id[0],
                self.model.aspect_id == id[1],
            )
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, sdoc_id=id[0], aspect_id=id[1])
        return db_obj

    def read_by_ids(
        self, db: Session, ids: list[tuple[int, int]]
    ) -> list[DocumentAspectORM]:
        """
        Read DocumentAspectORMs by a list of (sdoc_id, aspect_id) tuples.
        """
        if not ids:
            return []
        return (
            db.query(self.model)
            .filter(tuple_(self.model.sdoc_id, self.model.aspect_id).in_(ids))
            .all()
        )

    def read_by_aspect_and_sdoc_ids(
        self, db, *, sdoc_ids: list[int], aspect_id: int
    ) -> list[DocumentAspectORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.sdoc_id.in_(sdoc_ids),
            )
            .all()
        )

    def read_by_aspect_and_cluster_id(
        self, db, *, aspect_id: int, cluster_id: int
    ) -> list[DocumentAspectORM]:
        return (
            db.query(self.model)
            .join(DocumentClusterORM, DocumentClusterORM.sdoc_id == self.model.sdoc_id)
            .filter(
                self.model.aspect_id == aspect_id,
                DocumentClusterORM.cluster_id == cluster_id,
            )
            .all()
        )

    def read_by_aspect_id(self, db, *, aspect_id: int) -> list[DocumentAspectORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
            )
            .all()
        )

    def read_all_with_clusters_of_level(
        self, db, *, aspect_id: int, level: int
    ) -> list[DocumentAspectORM]:
        return (
            db.query(self.model)
            .join(DocumentClusterORM, DocumentClusterORM.sdoc_id == self.model.sdoc_id)
            .join(ClusterORM, ClusterORM.id == DocumentClusterORM.cluster_id)
            .filter(
                ClusterORM.aspect_id == aspect_id,
                ClusterORM.level == level,
            )
            .all()
        )

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentAspectUpdate],
    ) -> list[DocumentAspectORM]:
        """
        Update multiple DocumentAspectORMs by a list of (sdoc_id, aspect_id) tuples and corresponding update DTOs.
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


crud_document_aspect = CRUDDocumentAspect(DocumentAspectORM)
