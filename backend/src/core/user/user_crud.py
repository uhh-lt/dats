from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from core.auth.security import generate_password_hash
from core.project.project_orm import ProjectUserLinkTable
from core.user.user_dto import UserCreate, UserUpdate
from core.user.user_orm import UserORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase
from repos.db.sql_exceptions import NoSuchElementError

SYSTEM_USER_ID: int = 1
DEMO_USER_ID: int = 2


class CRUDUser(SQLCRUDBase[UserORM, UserCreate, UserUpdate]):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[UserCreate]
    ) -> list[UserORM]:
        # Flo: hashes the PW before storing in DB
        return super().create_multi(
            db=db,
            create_dtos=[
                create_dto.model_copy(
                    update={"password": generate_password_hash(create_dto.password)}
                )
                for create_dto in create_dtos
            ],
        )

    def create_virtual_user(
        self, db: Session, *, project_id: int, name: str
    ) -> UserORM:
        """Create a virtual user of the project: no email, no password, its name
        is its first name."""
        db_obj = self.model(project_id=project_id, first_name=name, last_name="")
        db.add(db_obj)
        db.flush()
        db.refresh(db_obj)
        return db_obj

    ### READ OPERATIONS ###

    def read_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        include_virtual: bool = True,
    ) -> list[UserORM]:
        query = db.query(self.model)
        if not include_virtual:
            query = query.filter(self.model.project_id.is_(None))
        return query.order_by(self.model.id).offset(skip).limit(limit).all()

    def read_by_project(self, db: Session, *, project_id: int) -> list[UserORM]:
        """
        Read the users of a project: its members, then its virtual users.

        Args:
            project_id: The project.

        Returns:
            The members and the virtual users, each ordered by id.
        """
        member_ids = select(ProjectUserLinkTable.user_id).where(
            ProjectUserLinkTable.project_id == project_id
        )
        return (
            db.query(self.model)
            .filter(
                self.model.id.in_(member_ids) | (self.model.project_id == project_id)
            )
            .order_by(self.model.project_id.is_not(None), self.model.id)
            .all()
        )

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

    def update_multi(
        self, db: Session, *, ids: list[int], update_dtos: list[UserUpdate]
    ) -> list[UserORM]:
        # Flo: hashes the PW before storing in DB
        return super().update_multi(
            db=db,
            ids=ids,
            update_dtos=[
                update_dto.model_copy(
                    update={"password": generate_password_hash(update_dto.password)}
                )
                if update_dto.password
                else update_dto
                for update_dto in update_dtos
            ],
        )


crud_user = CRUDUser(UserORM)
