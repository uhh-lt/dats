from fastapi import BackgroundTasks, Depends
from loguru import logger
from sqlalchemy.orm import Session

from common.dats_event import DATS_EVENT_TO_MODEL, DATSEvent, DATSEventBase
from common.dependencies import get_db_session
from core.auth.authz_user import AuthzUser
from systems.websocket_system.websocket_service import WebsocketService


class WebsocketEmitter:
    """Per-route dependency that pushes mutation results to websocket clients.

    Endpoints declare `ws: WebsocketEmitter = Depends()` and call one of the
    `emit_*` methods with the mutation result. The emitter takes care of
    everything else: building the concrete event, deciding the audience, and
    scheduling delivery.

    Every emit method follows the same pattern:
      1. build the concrete event class for the given `DATSEvent`, validating
         the payload against the registered payload type,
      2. defer delivery to a background task so the event fires AFTER the
         request's database commit — never emit synchronously inside a route,
         or a rollback would leak a phantom event.

    The payload IS the entity's read DTO (the mutation result the endpoint
    already returns), so there is nothing extra to construct at the call site.

    Actor exclusion applies to ALL emit methods: a JWT (human) triggerer
    already has the mutation result (it's the HTTP response), so they are
    EXCLUDED from the audience — their clients learn nothing new. An API-key
    triggerer has no human session, so the event is sent to everyone,
    including the actor's own connected clients.

    Usage (happy path):
        @router.put("", response_model=CodeRead)
        def create_new_code(
            *,
            db: Session = Depends(get_db_session),
            code: CodeCreate,
            authz_user: AuthzUser = Depends(),
            ws: WebsocketEmitter = Depends(),
        ) -> CodeRead:
            ...
            result = CodeRead.model_validate(db_code)
            ws.emit_to_project(DATSEvent.CODE_CREATED, result, project_id=code.project_id)
            return result
    """

    def __init__(
        self,
        *,
        authz_user: AuthzUser = Depends(),
        db: Session = Depends(get_db_session),
        background_tasks: BackgroundTasks,
    ):
        self._authz_user = authz_user
        self._db = db
        self._background_tasks = background_tasks
        self._websocket_service = WebsocketService()

    def emit_to_project(
        self, event_type: DATSEvent, payload, *, project_id: int
    ) -> None:
        """Emit an event to all members of a project after commit.

        Args:
            event_type: The event type.
            payload: The mutation result (the entity's read DTO). Its type must
                match the event class registered for `event_type`.
            project_id: The project whose members are the audience. Passed
                explicitly (from the body/path for creates, or
                `db_obj.get_project_id()` for `/{id}` routes).
        """
        event = self._build_event(event_type, payload)
        exclude_user_id = self._actor_exclusion()
        self._background_tasks.add_task(
            self._websocket_service.broadcast_to_project_users,
            db=self._db,
            event=event,
            proj_id=project_id,
            exclude_user_id=exclude_user_id,
        )
        logger.debug(
            f"Queued event '{event_type}' for project {project_id} "
            f"(exclude_user_id={exclude_user_id})"
        )

    def emit_to_user(self, event_type: DATSEvent, payload, *, user_id: int) -> None:
        """Emit an event to a single user after commit.

        Args:
            event_type: The event type.
            payload: The mutation result (the entity's read DTO).
            user_id: The target user.
        """
        if user_id == self._actor_exclusion():
            logger.debug(
                f"Skipped event '{event_type}' for user {user_id} (actor excluded)"
            )
            return
        event = self._build_event(event_type, payload)
        self._background_tasks.add_task(
            self._websocket_service.send_personal_event,
            user_id=user_id,
            event=event,
        )
        logger.debug(f"Queued event '{event_type}' for user {user_id}")

    def emit_to_users(
        self, event_type: DATSEvent, payload, *, user_ids: list[int]
    ) -> None:
        """Emit an event to an explicit set of users after commit.

        Args:
            event_type: The event type.
            payload: The mutation result (the entity's read DTO).
            user_ids: The target users.
        """
        excluded = self._actor_exclusion()
        user_ids = [uid for uid in user_ids if uid != excluded]
        if not user_ids:
            logger.debug(
                f"Skipped event '{event_type}': audience is empty after actor exclusion"
            )
            return
        event = self._build_event(event_type, payload)
        self._background_tasks.add_task(
            self._websocket_service.broadcast_to_multiple_users,
            user_ids=user_ids,
            event=event,
        )
        logger.debug(f"Queued event '{event_type}' for users {user_ids}")

    def emit_to_all(self, event_type: DATSEvent, payload) -> None:
        """Emit an event to every connected client after commit.

        Args:
            event_type: The event type.
            payload: The mutation result (the entity's read DTO).
        """
        event = self._build_event(event_type, payload)
        exclude_user_id = self._actor_exclusion()
        self._background_tasks.add_task(
            self._websocket_service.broadcast_event,
            event=event,
            exclude_user_id=exclude_user_id,
        )
        logger.debug(
            f"Queued event '{event_type}' for all users "
            f"(exclude_user_id={exclude_user_id})"
        )

    def _actor_exclusion(self) -> int | None:
        """User ID to exclude from the audience, or None to include everyone."""
        return None if self._authz_user.is_api_key else self._authz_user.user.id

    @staticmethod
    def _build_event(event_type: DATSEvent, payload) -> DATSEventBase:
        """Build the concrete event class for `event_type`, validating the payload."""
        event_class = DATS_EVENT_TO_MODEL[event_type]
        return event_class(type=event_type, payload=payload)
