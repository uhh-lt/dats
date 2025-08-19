from sqlalchemy.orm import Session, joinedload

from core.auth.security import generate_password_hash, verify_password
from core.user.user_dto import UserCreate, UserLogin, UserUpdate
from core.user.user_orm import UserORM
from repos.db.crud_base import CRUDBase, NoSuchElementError

SYSTEM_USER_ID: int = 1
ASSISTANT_ZEROSHOT_ID: int = 9990
ASSISTANT_FEWSHOT_ID: int = 9991
ASSISTANT_TRAINED_ID: int = 9992
SYSTEM_USER_IDS = [
    SYSTEM_USER_ID,
    ASSISTANT_ZEROSHOT_ID,
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
]


class CRUDUser(CRUDBase[UserORM, UserCreate, UserUpdate]):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, *, create_dto: UserCreate) -> UserORM:
        # Flo: hashes the PW before storing in DB
        hashed_pwd = generate_password_hash(create_dto.password)
        create_dto.password = hashed_pwd
        return super().create(db=db, create_dto=create_dto)

    def create_with_id(
        self, db: Session, *, create_dto: UserCreate, id: int
    ) -> UserORM:
        from fastapi.encoders import jsonable_encoder

        # hashes the PW before storing in DB
        hashed_pwd = generate_password_hash(create_dto.password)
        create_dto.password = hashed_pwd

        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(id=id, **dto_obj_data)
        db.add(db_obj)
        db.commit()
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

    ### UPDATE OPERATIONS ###

    def update(self, db: Session, *, id: int, update_dto: UserUpdate) -> UserORM:
        # Flo: hashes the PW before storing in DB
        if update_dto.password:
            hashed_pwd = generate_password_hash(update_dto.password)
            update_dto.password = hashed_pwd
        return super().update(db=db, id=id, update_dto=update_dto)

    ### OTHER OPERATIONS ###

    def authenticate(self, db: Session, user_login: UserLogin) -> UserORM | None:
        try:
            user = self.read_by_email(db=db, email=user_login.username)
        except NoSuchElementError:
            # Don't tell users if the email or the password was wrong
            # to prevent email guessing attacks
            return None

        if not verify_password(
            plain_password=user_login.password, hashed_password=user.password
        ):
            return None
        return user


crud_user = CRUDUser(UserORM)
