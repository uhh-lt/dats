from sqlalchemy.orm import Session

from modules.perspectives.cluster_dto import ClusterCreateIntern, ClusterUpdateIntern
from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from repos.db.project_crud_base import ProjectCRUDBase
from repos.db.sql_exceptions import NoSuchElementError


class CRUDCluster(
    ProjectCRUDBase[ClusterORM, ClusterCreateIntern, ClusterUpdateIntern]
):
    ### READ OPERATIONS ###

    def read_by_aspect(
        self, db: Session, *, project_id: int, aspect_id: int, id: int
    ) -> ClusterORM:
        """
        Read the cluster of the aspect; a cluster of another aspect is not found.

        Args:
            project_id: The project of the cluster.
            aspect_id: The aspect of the cluster.
            id: The id of the cluster.

        Returns:
            The cluster.

        Raises:
            NoSuchElementError: If the aspect has no cluster with the id.
        """
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.aspect_id == aspect_id,
                self.model.id == id,
            )
            .one_or_none()
        )
        if db_obj is None:
            raise NoSuchElementError(
                self.model, project_id=project_id, aspect_id=aspect_id, id=id
            )
        return db_obj

    def read_or_create_outlier_cluster(
        self, db: Session, *, project_id: int, aspect_id: int, level: int
    ) -> ClusterORM:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.aspect_id == aspect_id,
                self.model.level == level,
                self.model.is_outlier.is_(True),
            )
            .first()
        )
        if db_obj is None:
            db_obj = self.create(
                db=db,
                project_id=project_id,
                create_dto=ClusterCreateIntern(
                    aspect_id=aspect_id,
                    level=level,
                    name="Outlier",
                    is_outlier=True,
                ),
            )
        return db_obj

    def read_by_aspect_and_level(
        self, db: Session, *, project_id: int, aspect_id: int, level: int
    ) -> list[ClusterORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.aspect_id == aspect_id,
                self.model.level == level,
            )
            .all()
        )

    def read_by_aspect_and_sdoc(
        self, db: Session, *, project_id: int, aspect_id: int, sdoc_id: int
    ) -> list[ClusterORM]:
        return (
            db.query(self.model)
            .join(
                DocumentClusterORM,
                (DocumentClusterORM.project_id == self.model.project_id)
                & (DocumentClusterORM.cluster_id == self.model.id),
            )
            .filter(
                self.model.project_id == project_id,
                self.model.aspect_id == aspect_id,
                DocumentClusterORM.sdoc_id == sdoc_id,
            )
            .all()
        )


crud_cluster = CRUDCluster(ClusterORM)
