from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, tuple_
from sqlalchemy.orm import Session

from config import conf
from modules.perspectives.document_aspect.document_aspect_dto import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from modules.perspectives.document_aspect.document_aspect_orm import DocumentAspectORM
from modules.perspectives.document_cluster.document_cluster_orm import (
    DocumentClusterORM,
)
from repos.db.crud_base import CRUDBase, NoSuchElementError

BATCH_SIZE = conf.postgres.batch_size


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

        db_objects: list[DocumentAspectORM] = []

        # 1. Process the composite key list in batches
        for i in range(0, len(ids), BATCH_SIZE):
            batch_ids = ids[i : i + BATCH_SIZE]

            # 2. Build the SELECT statement
            stmt = select(self.model).filter(
                tuple_(self.model.sdoc_id, self.model.aspect_id).in_(batch_ids)
            )

            # 3. Execute the statement and fetch the results
            batch_objects = db.scalars(stmt).all()
            db_objects.extend(batch_objects)

        # 4. Sort the results to match the input order
        id_map: dict[tuple[int, int], DocumentAspectORM] = {
            (obj.sdoc_id, obj.aspect_id): obj for obj in db_objects
        }
        result: list[DocumentAspectORM] = []
        for key in ids:
            if key in id_map:
                result.append(id_map[key])
            else:
                raise NoSuchElementError(self.model, sdoc_id=key[0], aspect_id=key[1])

        return result

    def read_by_aspect_and_cluster(
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

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentAspectUpdate],
        manual_commit: bool = False,
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
        if manual_commit:
            db.flush()
        else:
            db.commit()
        return db_objects

    def delete_multi(
        self, db: Session, *, ids: list[tuple[int, int]], manual_commit: bool = False
    ) -> list[DocumentAspectORM]:
        """
        Delete multiple DocumentAspectORMs by a list of (sdoc_id, aspect_id) tuples.
        """
        db_objects = self.read_by_ids(db, ids)

        for db_obj in db_objects:
            db.delete(db_obj)

        if manual_commit:
            db.flush()
        else:
            db.commit()

        return db_objects


crud_document_aspect = CRUDDocumentAspect(DocumentAspectORM)
