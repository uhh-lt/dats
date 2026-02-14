from modules.perspectives.aspect.aspect_dto import AspectCreate, AspectUpdateIntern
from modules.perspectives.aspect.aspect_orm import AspectORM
from repos.db.crud_base import CRUDBase


class CRUDAspect(CRUDBase[AspectORM, AspectCreate, AspectUpdateIntern]):
    pass


crud_aspect = CRUDAspect(AspectORM)
