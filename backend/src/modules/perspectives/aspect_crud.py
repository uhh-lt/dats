from sqlalchemy.orm import Session

from modules.perspectives.aspect_dto import AspectCreate, AspectUpdateIntern
from modules.perspectives.aspect_orm import AspectORM
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDAspect(ProjectCRUDBase[AspectORM, AspectCreate, AspectUpdateIntern]):
    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, *, project_id: int) -> list[AspectORM]:
        """
        Read all aspects of a project.

        Args:
            project_id: The ID of the project.

        Returns:
            The aspects of the project, ordered by id.
        """
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id)
            .order_by(self.model.id)
            .all()
        )


crud_aspect = CRUDAspect(AspectORM)
