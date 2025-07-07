from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.cluster import ClusterCreateIntern, ClusterUpdateIntern
from app.core.data.orm.cluster import ClusterORM
from app.core.data.orm.document_cluster import DocumentClusterORM


class CRUDCluster(CRUDBase[ClusterORM, ClusterCreateIntern, ClusterUpdateIntern]):
    def read_or_create_outlier_cluster(
        self, db, *, aspect_id: int, level: int
    ) -> ClusterORM:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.level == level,
                self.model.is_outlier.is_(True),
            )
            .first()
        )
        if db_obj is None:
            db_obj = crud_cluster.create(
                db=db,
                create_dto=ClusterCreateIntern(
                    aspect_id=aspect_id,
                    level=level,
                    name="Outlier",
                    is_outlier=True,
                ),
            )
        return db_obj

    def read_by_aspect_and_level(
        self, db, *, aspect_id: int, level: int
    ) -> list[ClusterORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.level == level,
            )
            .all()
        )

    def read_by_aspect_and_sdoc(
        self, db, *, aspect_id: int, sdoc_id: int
    ) -> list[ClusterORM]:
        return (
            db.query(self.model)
            .join(DocumentClusterORM, DocumentClusterORM.cluster_id == self.model.id)
            .filter(
                self.model.aspect_id == aspect_id,
                DocumentClusterORM.sdoc_id == sdoc_id,
            )
            .all()
        )


crud_cluster = CRUDCluster(ClusterORM)
