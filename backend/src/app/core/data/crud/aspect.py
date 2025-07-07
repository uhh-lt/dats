from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.aspect import AspectCreate, AspectUpdateIntern
from app.core.data.orm.aspect import AspectORM


class CRUDAspect(CRUDBase[AspectORM, AspectCreate, AspectUpdateIntern]):
    pass


crud_aspect = CRUDAspect(AspectORM)
