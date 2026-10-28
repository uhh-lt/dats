from fastapi.encoders import jsonable_encoder
from loguru import logger
from pydantic_ai.messages import ModelMessage, ModelMessagesTypeAdapter
from sqlalchemy.orm import Session

from modules.agent.agent_session_dto import AgentSessionCreate, AgentSessionUpdate
from modules.agent.agent_session_orm import AgentSessionORM
from repos.db.crud_base import CRUDBase


class CRUDAgentSession(
    CRUDBase[AgentSessionORM, AgentSessionCreate, AgentSessionUpdate]
):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, *, create_dto: AgentSessionCreate) -> AgentSessionORM:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.flush()
        return db_obj

    ### READ OPERATIONS ###

    def read_by_session_id_and_user(
        self, db: Session, session_id: str, user_id: int
    ) -> AgentSessionORM | None:
        return (
            db.query(self.model)
            .filter(self.model.session_id == session_id, self.model.user_id == user_id)
            .first()
        )

    def get_session_history(
        self, db: Session, session_id: str, user_id: int
    ) -> list[ModelMessage]:
        session = self.read_by_session_id_and_user(
            db, session_id=session_id, user_id=user_id
        )
        if not session:
            return []

        try:
            return ModelMessagesTypeAdapter.validate_python(session.messages)
        except Exception as e:
            logger.error(
                f"Failed to parse session history for session {session_id}: {e}"
            )
            return []

    def get_user_sessions(self, db: Session, user_id: int) -> list[AgentSessionORM]:
        return db.query(self.model).filter(self.model.user_id == user_id).all()

    ### UPDATE OPERATIONS ###

    def save_session_history(
        self,
        db: Session,
        session_id: str,
        user_id: int,
        messages: list[ModelMessage],
    ) -> AgentSessionORM:

        serialized_messages = ModelMessagesTypeAdapter.dump_python(
            messages, mode="json"
        )
        session = self.read_by_session_id_and_user(
            db, session_id=session_id, user_id=user_id
        )

        if session:
            session.messages = serialized_messages
        else:
            create_dto = AgentSessionCreate(
                session_id=session_id,
                user_id=user_id,
                messages=serialized_messages,
            )
            session = self.create(db, create_dto=create_dto)

        db.flush()
        return session

    def update_title_by_id(
        self, db: Session, session_id: str, user_id: int, title: str
    ) -> bool:
        session = self.read_by_session_id_and_user(
            db, session_id=session_id, user_id=user_id
        )
        if session:
            session.title = title
            db.flush()
            return True
        return False

    ### DELETE OPERATIONS ###

    def delete_by_session_id(self, db: Session, session_id: str, user_id: int) -> bool:
        session = self.read_by_session_id_and_user(
            db, session_id=session_id, user_id=user_id
        )
        if session:
            db.delete(session)
            db.flush()
            return True
        return False


crud_agent_session = CRUDAgentSession(AgentSessionORM)
