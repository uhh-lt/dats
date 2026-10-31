from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.user.user_crud import crud_user
from core.user.user_dto import UserRead, UserUpdate, VirtualUserUpdate
from core.user.user_exceptions import NotAVirtualUserError


class UserService(metaclass=SingletonMeta):
    """Manages the virtual users of the projects: users without login that belong
    to one project and own annotations, e.g. of LLM Assistant runs. Other services
    (LLM Assistant, classifier, import) create them here."""

    def __new__(cls, *args, **kwargs):
        return super(UserService, cls).__new__(cls)

    def create_virtual_user(
        self, *, db: Session, project_id: int, name: str
    ) -> UserRead:
        db_obj = crud_user.create_virtual_user(db=db, project_id=project_id, name=name)
        return UserRead.model_validate(db_obj)

    def update_virtual_user(
        self, *, db: Session, user_id: int, update_dto: VirtualUserUpdate
    ) -> UserRead:
        self.assert_virtual_user(db=db, user_id=user_id)
        db_obj = crud_user.update(
            db=db, id=user_id, update_dto=UserUpdate(first_name=update_dto.name)
        )
        return UserRead.model_validate(db_obj)

    def delete_virtual_user(self, *, db: Session, user_id: int) -> UserRead:
        """Delete a virtual user together with its annotation documents,
        annotations and memos. Annotations copied from it keep their provenance,
        whose source user becomes NULL ("a deleted user")."""
        self.assert_virtual_user(db=db, user_id=user_id)
        result = UserRead.model_validate(crud_user.read(db=db, id=user_id))
        crud_user.delete(db=db, id=user_id)
        return result

    def assert_virtual_user(
        self, *, db: Session, user_id: int, project_id: int | None = None
    ) -> None:
        """
        Raises:
            NotAVirtualUserError: If the user is not virtual, or a virtual user of
                another project than the given one.
        """
        db_obj = crud_user.read(db=db, id=user_id)
        if not db_obj.is_virtual or (
            project_id is not None and db_obj.project_id != project_id
        ):
            raise NotAVirtualUserError(user_id=user_id, project_id=project_id)
