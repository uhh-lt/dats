from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.project import ProjectCreate, ProjectUpdate
from app.core.data.orm.project import ProjectORM


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    pass


crud_project = CRUDProject(ProjectORM)
