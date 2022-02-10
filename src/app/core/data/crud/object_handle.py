from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.object_handle import ObjectHandleORM


class CRUDObjectHandle(CRUDBase[ObjectHandleORM, ObjectHandleCreate, None]):
    pass


crud_object_handle = CRUDObjectHandle(ObjectHandleORM)
