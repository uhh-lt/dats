from modules.perspectives.cluster_dto import ClusterCreateIntern, ClusterUpdateIntern
from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from repos.db.crud_base import CRUDBase


class CRUDCluster(CRUDBase[ClusterORM, ClusterCreateIntern, ClusterUpdateIntern]):
    def read_outlier_cluster(self, db, *, aspect_id: int) -> ClusterORM | None:
        return (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.is_outlier.is_(True),
            )
            .first()
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
