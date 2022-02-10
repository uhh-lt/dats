from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.user import UserCreate, UserUpdate
from app.core.data.orm.user import UserORM


class CRUDUser(CRUDBase[UserORM, UserCreate, UserUpdate]):
    pass


crud_user = CRUDUser(UserORM)
