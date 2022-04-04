from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.current_code import CurrentCodeCreate, CurrentCodeUpdate
from app.core.data.orm.code import CurrentCodeORM


class CRUDCurrentCode(CRUDBase[CurrentCodeORM, CurrentCodeCreate, CurrentCodeUpdate]):
    pass


crud_current_code = CRUDCurrentCode(CurrentCodeORM)
