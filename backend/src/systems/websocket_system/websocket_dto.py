from typing import Annotated, List, Literal

from pydantic import BaseModel, BeforeValidator, Field, SerializeAsAny, model_validator

from common.dats_event import DATS_EVENT_TO_MODEL, DATSEventBase


def _resolve_event(value: object) -> DATSEventBase:
    """Resolve a raw event dict to its concrete DATSEventBase subclass.

    Dispatches on the `type` field via DATS_EVENT_TO_MODEL at parse time, so
    events registered lazily (JOB_UPDATED) resolve correctly regardless of
    when this module was imported.
    """
    if isinstance(value, DATSEventBase):
        return value
    if isinstance(value, dict):
        event_type = value.get("type")
        if event_type is not None:
            model = DATS_EVENT_TO_MODEL.get(event_type)
            if model is not None:
                return model.model_validate(value)
    raise ValueError(f"Unknown or malformed websocket event: {value!r}")


# Internal wrapper to fan out events across API worker processes via Redis.
# Never sent to clients — they only receive the `message`.
class WebSocketEnvelope(BaseModel):
    origin_worker: int = Field(
        description="PID of the worker that published the event, so a worker can skip re-delivering its own messages."
    )
    kind: Literal["users", "all"] = Field(
        description="Delivery scope: 'users' targets specific connections, 'all' reaches every connected client."
    )
    user_ids: List[int] | None = Field(
        description="Target user IDs when kind='users'; None when kind='all'."
    )
    exclude_user_id: int | None = Field(
        description="User to exclude from delivery (the actor who triggered the event); only meaningful for kind='all'."
    )
    # Any DATS event. Typed as the base (not a discriminated union) because the
    # event models are generated dynamically and JOB_UPDATED is registered
    # lazily after job registration — an import-time union would miss it. The
    # BeforeValidator resolves the concrete subclass at parse time, and
    # SerializeAsAny ensures the full subclass (incl. payload) is serialized.
    message: Annotated[
        SerializeAsAny[DATSEventBase], BeforeValidator(_resolve_event)
    ] = Field(description="The event delivered to clients.")

    @model_validator(mode="after")
    def _check_user_ids_match_kind(self):
        if self.kind == "users":
            if not self.user_ids:
                raise ValueError("user_ids must be set when kind='users'")
            if self.exclude_user_id is not None:
                raise ValueError("exclude_user_id must be None when kind='users'")
        if self.kind == "all" and self.user_ids is not None:
            raise ValueError("user_ids must be None when kind='all'")
        return self
