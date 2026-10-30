from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from core.auth.security import generate_password_hash
from core.project.project_orm import ProjectUserLinkTable
from core.user.user_dto import UserCreate, UserUpdate, VirtualAnnotatorCreateIntern
from core.user.user_enum import UserKind
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

    def create_virtual_annotator(
        self, db: Session, *, create_dto: VirtualAnnotatorCreateIntern
    ) -> UserORM:
        """
        Create a virtual annotator: a user of one project without email and
        password, whose display name is its first name.

        Args:
            create_dto: The project and the display name.

        Returns:
            The created virtual annotator.
        """
        db_obj = self.model(
            kind=UserKind.VIRTUAL,
            project_id=create_dto.project_id,
            first_name=create_dto.name,
            last_name="",
            email=None,
            password=None,
        )
        db.add(db_obj)
        db.flush()
        db.refresh(db_obj)
        return db_obj

    ### READ OPERATIONS ###

    def read_humans(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> list[UserORM]:
        """
        Read the human users of the system, without the virtual annotators of the
        projects.

        Args:
            skip: The number of users to skip.
            limit: The maximum number of users to read.

        Returns:
            The human users, ordered by id.
        """
        return (
            db.query(self.model)
            .filter(self.model.kind == UserKind.HUMAN)
            .order_by(self.model.id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def read_virtual_annotators_by_project(
        self, db: Session, *, project_id: int
    ) -> list[UserORM]:
        """
        Read the virtual annotators of a project.

        Args:
            project_id: The project.

        Returns:
            The virtual annotators of the project, ordered by id.
        """
        return (
            db.query(self.model)
            .filter(
                self.model.kind == UserKind.VIRTUAL,
                self.model.project_id == project_id,
            )
            .order_by(self.model.id)
            .all()
        )

    def read_annotators_by_project(
        self, db: Session, *, project_id: int
    ) -> list[UserORM]:
        """
        Read everybody who can own annotations in a project: its members and its
        virtual annotators.

        Args:
            project_id: The project.

        Returns:
            The members (ordered by id), followed by the virtual annotators
            (ordered by id).
        """
        member_ids = select(ProjectUserLinkTable.user_id).where(
            ProjectUserLinkTable.project_id == project_id
        )
        return (
            db.query(self.model)
            .filter(
                (self.model.id.in_(member_ids)) | (self.model.project_id == project_id)
            )
            .order_by(self.model.kind, self.model.id)
            .all()
        )

    def read_virtual_annotators_by_names(
        self, db: Session, *, project_id: int, names: list[str]
    ) -> list[UserORM]:
        """
        Read the virtual annotators of a project by their display names.

        Args:
            project_id: The project.
            names: The display names, unique per project.

        Returns:
            The existing virtual annotators, in no particular order.
        """
        if not names:
            return []

        db_objs: list[UserORM] = []
        for i in range(0, len(names), BATCH_SIZE):
            batch_names = names[i : i + BATCH_SIZE]
            stmt = select(self.model).where(
                self.model.kind == UserKind.VIRTUAL,
                self.model.project_id == project_id,
                self.model.first_name.in_(batch_names),
            )
            db_objs.extend(db.scalars(stmt).all())
        return db_objs

    def read_virtual_annotator_by_name(
        self, db: Session, *, project_id: int, name: str
    ) -> UserORM | None:
        """
        Read the virtual annotator of a project by its display name.

        Args:
            project_id: The project.
            name: The display name, unique per project.

        Returns:
            The virtual annotator, or None if the project has none of that name.
        """
        return (
            db.query(self.model)
            .filter(
                self.model.kind == UserKind.VIRTUAL,
                self.model.project_id == project_id,
                self.model.first_name == name,
            )
            .first()
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
