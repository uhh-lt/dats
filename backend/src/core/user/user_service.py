from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.user.user_crud import crud_user
from core.user.user_dto import (
    UserRead,
    UserUpdate,
    VirtualAnnotatorCreateIntern,
    VirtualAnnotatorUpdate,
)
from core.user.user_exceptions import NotAVirtualAnnotatorError


class UserService(metaclass=SingletonMeta):
    """Manages the virtual annotators of the projects: project-scoped users
    without login that own annotations, e.g. of LLM Assistant runs. Other
    services (LLM Assistant, classifier, Experiment Studio) create them here."""

    def __new__(cls, *args, **kwargs):
        return super(UserService, cls).__new__(cls)

    def create_virtual_annotator(
        self, *, db: Session, project_id: int, name: str
    ) -> UserRead:
        db_obj = crud_user.create_virtual_annotator(
            db=db,
            create_dto=VirtualAnnotatorCreateIntern(project_id=project_id, name=name),
        )
        return UserRead.model_validate(db_obj)

    def read_or_create_virtual_annotator(
        self, *, db: Session, project_id: int, name: str
    ) -> UserRead:
        """Return the virtual annotator of the project with this name, creating it
        if the project has none."""
        db_obj = crud_user.read_virtual_annotator_by_name(
            db=db, project_id=project_id, name=name
        )
        if db_obj is not None:
            return UserRead.model_validate(db_obj)
        return self.create_virtual_annotator(db=db, project_id=project_id, name=name)

    def read_virtual_annotators(
        self, *, db: Session, project_id: int
    ) -> list[UserRead]:
        return [
            UserRead.model_validate(db_obj)
            for db_obj in crud_user.read_virtual_annotators_by_project(
                db=db, project_id=project_id
            )
        ]

    def update_virtual_annotator(
        self, *, db: Session, user_id: int, update_dto: VirtualAnnotatorUpdate
    ) -> UserRead:
        self.assert_virtual_annotator(db=db, user_id=user_id)
        db_obj = crud_user.update(
            db=db, id=user_id, update_dto=UserUpdate(first_name=update_dto.name)
        )
        return UserRead.model_validate(db_obj)

    def delete_virtual_annotator(self, *, db: Session, user_id: int) -> UserRead:
        """Delete a virtual annotator together with its annotation documents,
        annotations and memos. Annotations copied from it keep their provenance,
        whose source user becomes NULL ("a deleted user")."""
        self.assert_virtual_annotator(db=db, user_id=user_id)
        result = UserRead.model_validate(crud_user.read(db=db, id=user_id))
        crud_user.delete(db=db, id=user_id)
        return result

    def assert_virtual_annotator(
        self, *, db: Session, user_id: int, project_id: int | None = None
    ) -> None:
        """
        Raises:
            NotAVirtualAnnotatorError: If the user is human, or a virtual annotator
                of another project than the given one.
        """
        db_obj = crud_user.read(db=db, id=user_id)
        if not db_obj.is_virtual or (
            project_id is not None and db_obj.project_id != project_id
        ):
            raise NotAVirtualAnnotatorError(user_id=user_id, project_id=project_id)
