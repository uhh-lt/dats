from modules.perspectives.aspect_dto import AspectCreate, AspectUpdateIntern
from modules.perspectives.aspect_orm import AspectORM
from repos.db.crud_base import SQLCRUDBase


class CRUDAspect(SQLCRUDBase[AspectORM, AspectCreate, AspectUpdateIntern]):
    pass


crud_aspect = CRUDAspect(AspectORM)
