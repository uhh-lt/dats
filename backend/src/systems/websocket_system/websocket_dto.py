from typing import Annotated, List, Literal, Union

from pydantic import BaseModel, Field, model_validator

from common.dats_event import DATS_EVENT_TO_MODEL

# Discriminated union over all events (keyed by `type`), so Redis envelopes
# parse back into the right event class. The union members are generated
# dynamically, so Pyright cannot see this as a valid type expression — every
# member is a DATSEventBase subclass, use DATSEventBase for annotations instead.
WebSocketEvent = Annotated[
    Union[tuple(DATS_EVENT_TO_MODEL.values())],
    Field(discriminator="type"),
]


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
    message: WebSocketEvent = Field(  # pyright: ignore[reportInvalidTypeForm]
        description="The event delivered to clients."
    )

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
