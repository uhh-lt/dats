from sqlalchemy.orm import Session

from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM


class UserFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self, create_dto: UserCreate | None = None, user_id: int | None = None
    ) -> UserORM:
        if create_dto is None:
            # TODO randomize?
            create_dto = UserCreate(
                email="alice@bob.de",
                first_name="Alice",
                last_name="Bob",
                password="SecurePassword123",
            )
        if user_id is not None:
            return crud_user.create_with_id(
                db=self.db_session,
                create_dto=create_dto,
                id=user_id,
            )
        return crud_user.create(
            db=self.db_session,
            create_dto=create_dto,
        )
