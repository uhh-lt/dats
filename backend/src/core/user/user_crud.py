from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from core.auth.security import generate_password_hash
from core.user.user_dto import UserCreate, UserUpdate
from core.user.user_orm import UserORM
from repos.db.crud_base import BATCH_SIZE, NoSuchElementError, SQLCRUDBase

SYSTEM_USER_ID: int = 1
DEMO_USER_ID: int = 2
ASSISTANT_ZEROSHOT_ID: int = 9990
ASSISTANT_FEWSHOT_ID: int = 9991
ASSISTANT_TRAINED_ID: int = 9992
SYSTEM_USER_IDS = [
    SYSTEM_USER_ID,
    ASSISTANT_ZEROSHOT_ID,
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
]


class CRUDUser(SQLCRUDBase[UserORM, UserCreate, UserUpdate]):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, *, create_dto: UserCreate) -> UserORM:
        # Flo: hashes the PW before storing in DB
        hashed_pwd = generate_password_hash(create_dto.password)
        create_dto.password = hashed_pwd
        return super().create(db=db, create_dto=create_dto)

    def create_with_id(
        self, db: Session, *, create_dto: UserCreate, id: int
    ) -> UserORM:
        # hashes the PW before storing in DB
        hashed_pwd = generate_password_hash(create_dto.password)
        create_dto.password = hashed_pwd

        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(id=id, **dto_obj_data)
        db.add(db_obj)
        db.flush()
        db.refresh(db_obj)
        return db_obj

    ### READ OPERATIONS ###

    def read_by_email(self, db: Session, *, email: str) -> UserORM:
        # Flo: email is unique so there can be only one, which is why we use first() here
        user = (
            db.query(self.model)
            .options(joinedload(self.model.projects))
            .filter(self.model.email == email)
            .first()
        )
        if user is None:
            raise NoSuchElementError(self.model, email=email)
        return user

    def read_by_email_if_exists(self, db: Session, *, email: str) -> UserORM | None:
        user = (
            db.query(self.model)
            .options(joinedload(self.model.projects))
            .filter(self.model.email == email)
            .first()
        )
        return user

    def read_by_emails(self, db: Session, *, emails: list[str]) -> list[UserORM]:
        if not emails:
            return []

        db_objs: list[UserORM] = []
        for i in range(0, len(emails), BATCH_SIZE):
            batch_emails = emails[i : i + BATCH_SIZE]
            stmt = select(self.model).where(self.model.email.in_(batch_emails))
            db_objs.extend(db.scalars(stmt).all())
        return db_objs

    ### UPDATE OPERATIONS ###

    def update(self, db: Session, *, id: int, update_dto: UserUpdate) -> UserORM:
        # Flo: hashes the PW before storing in DB
        if update_dto.password:
            hashed_pwd = generate_password_hash(update_dto.password)
            update_dto.password = hashed_pwd
        return super().update(db=db, id=id, update_dto=update_dto)


crud_user = CRUDUser(UserORM)
