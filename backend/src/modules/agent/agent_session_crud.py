from sqlalchemy.orm import Session

from modules.agent.agent_session_dto import (
    AgentSessionCreate,
    AgentSessionUpdateIntern,
)
from modules.agent.agent_session_orm import AgentSessionORM
from repos.db.crud_base import SQLCRUDBase
from repos.db.sql_exceptions import NoSuchElementError


class CRUDAgentSession(
    SQLCRUDBase[AgentSessionORM, AgentSessionCreate, AgentSessionUpdateIntern]
):
    ### CREATE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### READ OPERATIONS ###

    def read_by_user_and_session_id(
        self, db: Session, *, user_id: int, session_id: str
    ) -> AgentSessionORM:
        """
        Read the session of a user by its client-chosen session id.

        Args:
            user_id: The owner of the session.
            session_id: The client-chosen id of the session.

        Returns:
            The session.

        Raises:
            NoSuchElementError: If the user has no session with this id.
        """
        db_obj = self.read_by_user_and_session_id_if_exists(
            db=db, user_id=user_id, session_id=session_id
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, user_id=user_id, session_id=session_id)
        return db_obj

    def read_by_user_and_session_id_if_exists(
        self, db: Session, *, user_id: int, session_id: str
    ) -> AgentSessionORM | None:
        """
        Read the session of a user by its client-chosen session id, if it exists.

        Args:
            user_id: The owner of the session.
            session_id: The client-chosen id of the session.

        Returns:
            The session, or None if the user has no session with this id.
        """
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.session_id == session_id)
            .first()
        )

    def read_by_user(self, db: Session, *, user_id: int) -> list[AgentSessionORM]:
        """
        Read all sessions of a user, the most recently updated first.

        Args:
            user_id: The owner of the sessions.

        Returns:
            The sessions.
        """
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id)
            .order_by(self.model.updated.desc(), self.model.id.desc())
            .all()
        )

    ### UPDATE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### DELETE OPERATIONS ###
    # Inherited from SQLCRUDBase


crud_agent_session = CRUDAgentSession(AgentSessionORM)
