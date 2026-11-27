import secrets
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from core.auth.security import generate_password_hash
from core.project.project_orm import ProjectUserLinkTable
from core.user.user_dto import UserCreate, UserUpdate
from core.user.user_orm import UserORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase
from repos.db.sql_exceptions import NoSuchElementError

VIRTUAL_USER_EMAIL_DOMAIN = "virtual.dats"

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
        self, db: Session, *, project_id: int, name: str, email: str | None = None
    ) -> UserORM:
        """
        Create a virtual user of the project. Its name is its first name; it gets
        a unique email (unless given, e.g. on import) and a random password that is
        no valid hash, so it can never log in.
        """
        db_obj = self.model(
            project_id=project_id,
            first_name=name,
            last_name="",
            email=email or f"{uuid4().hex}@{VIRTUAL_USER_EMAIL_DOMAIN}",
            password=secrets.token_hex(32),
        )
        db.add(db_obj)
        db.flush()
        db.refresh(db_obj)
        return db_obj

    ### READ OPERATIONS ###

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

    def read_by_project_and_ids(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> list[UserORM]:
        """
        Read users of a project (members and virtual users) by id.

        Args:
            project_id: The project.
            ids: The ids to read.

        Returns:
            The users, in the order of `ids`; raises NoSuchElementError for an id
            that is no user of the project.
        """
        users = {
            user.id: user for user in self.read_by_project(db, project_id=project_id)
        }
        for id in ids:
            if id not in users:
                raise NoSuchElementError(self.model, project_id=project_id, id=id)
        return [users[id] for id in ids]

    def read_by_project_and_emails(
        self, db: Session, *, project_id: int, emails: list[str]
    ) -> list[UserORM]:
        """
        Read users of a project (members and virtual users) by email.

        Args:
            project_id: The project.
            emails: The emails to read.

        Returns:
            The users with one of the emails, ordered like `read_by_project`; an
            email of no user of the project matches nothing.
        """
        wanted = set(emails)
        return [
            user
            for user in self.read_by_project(db, project_id=project_id)
            if user.email in wanted
        ]

    def read_virtual_user(self, db: Session, *, project_id: int, id: int) -> UserORM:
        """
        Read a virtual user of the project.

        Args:
            project_id: The project of the virtual user.
            id: The id of the virtual user.

        Returns:
            The virtual user; raises NoSuchElementError for any other user.
        """
        user = (
            db.query(self.model)
            .filter(self.model.id == id, self.model.project_id == project_id)
            .first()
        )
        if user is None:
            raise NoSuchElementError(self.model, project_id=project_id, id=id)
        return user

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
