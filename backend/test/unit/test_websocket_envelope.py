"""Every DATS event survives the fan-out between API workers.

A worker publishes a `WebSocketEnvelope` to the other workers as JSON
(`model_dump_json`), and they parse it back (`model_validate_json`). A payload
DTO that loses data on the way (e.g. a required field with `exclude=True`) is
dropped as malformed by the receiving workers, so its clients never get the
event.
"""

import types
from collections.abc import Sequence
from datetime import date, datetime
from enum import Enum
from pathlib import Path, PurePath
from typing import Annotated, Any, Literal, Union, get_args, get_origin

import pytest
from annotated_types import Ge, Gt
from pydantic import BaseModel, EmailStr

from bootstrap import register_jobs
from common.dats_event import DATS_EVENT_TO_MODEL, DATSEvent
from modules.llm_assistant.llm_assistant_job_dto import LLMAssistantJobInput
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import FilterExpression
from systems.search_system.grouping import GroupConfig
from systems.websocket_system.websocket_dto import WebSocketEnvelope

# JOB_UPDATED exists only once all jobs are registered.
register_jobs()

# Nested models deeper than this get no optional children, so recursive DTOs end.
MAX_DEPTH = 6

# Optional fields the samples leave empty, because a validator allows only one
# of several optional fields.
EMPTY_FIELDS: dict[type[BaseModel], set[str]] = {
    LLMAssistantJobInput: {"prompt_version_id"},
}


# ===========================================================================
# PAYLOAD FACTORY
# ===========================================================================
# Builds a valid value for any payload type from its annotation: every field
# is filled (also optional ones and those with defaults), so a field that is
# lost in the round trip changes the parsed payload.


def _union_members(annotation: Any) -> list[Any]:
    """The members of a union type (without None), or the type itself."""
    if get_origin(annotation) in (Union, types.UnionType):
        return [arg for arg in get_args(annotation) if arg is not type(None)]
    return [annotation]


def _lower_bound(constraints: Sequence[Any], default: float, step: float) -> float:
    """The smallest allowed number (`step` above an exclusive bound), so that
    e.g. `begin` (ge=0) < `end`."""
    for constraint in constraints:
        if isinstance(constraint, Ge) and isinstance(constraint.ge, int | float):
            return constraint.ge
        if isinstance(constraint, Gt) and isinstance(constraint.gt, int | float):
            return constraint.gt + step
    return default


def _sample(annotation: Any, depth: int = 0, constraints: Sequence[Any] = ()) -> Any:
    """A valid value of `annotation` (with the field's `constraints`)."""
    origin = get_origin(annotation)
    args = get_args(annotation)
    if origin is Annotated:
        return _sample(args[0], depth, (*constraints, *args[1:]))
    if origin in (Union, types.UnionType):
        if depth > MAX_DEPTH and type(None) in args:
            return None
        return _sample(_union_members(annotation)[0], depth, constraints)
    if origin is Literal:
        return args[0]
    if origin in (list, set, frozenset):
        return [] if depth > MAX_DEPTH else [_sample(args[0], depth)]
    if origin is tuple:
        if len(args) == 2 and args[1] is Ellipsis:
            return (_sample(args[0], depth),)
        return tuple(_sample(arg, depth) for arg in args)
    if origin is dict:
        return {_sample(args[0], depth): _sample(args[1], depth)}
    if annotation is None or annotation is type(None):
        return None
    if annotation is Any:
        return "any"
    if annotation is EmailStr:
        return "jane.doe@example.org"
    if isinstance(annotation, type):
        if issubclass(annotation, FilterExpression):
            return _sample_filter_expression(annotation)
        if issubclass(annotation, GroupConfig):
            return _sample_group_config(annotation)
        if issubclass(annotation, BaseModel):
            return _sample_model(annotation, depth + 1)
        if issubclass(annotation, Enum):
            return next(iter(annotation))
        if issubclass(annotation, bool):
            return True
        if issubclass(annotation, int):
            return int(_lower_bound(constraints, 1, 1))
        if issubclass(annotation, float):
            return float(_lower_bound(constraints, 0.5, 0.5))
        if issubclass(annotation, str):
            return "text"
        if issubclass(annotation, datetime):
            return datetime(2024, 1, 2, 3, 4, 5)
        if issubclass(annotation, date):
            return date(2024, 1, 2)
        if issubclass(annotation, PurePath):
            return Path("file.txt")
    raise NotImplementedError(f"No sample value for {annotation!r}")


def _sample_model(model: type[BaseModel], depth: int = 0) -> BaseModel:
    """A valid instance of `model` with every field set (but its EMPTY_FIELDS)."""
    empty_fields = EMPTY_FIELDS.get(model, set())
    return model.model_validate(
        {
            field.alias or name: None
            if name in empty_fields
            else _sample(field.annotation, depth, field.metadata)
            for name, field in model.model_fields.items()
        }
    )


def _sample_filter_expression(model: type[FilterExpression]) -> FilterExpression:
    """A filter expression on the first column, with an operator of its family."""
    column = next(iter(_union_members(model.model_fields["column"].annotation)[0]))
    operator = next(
        operator
        for operators in _union_members(model.model_fields["operator"].annotation)
        for operator in operators
        if operator.get_filter_operator() == column.get_filter_operator()
    )
    return model(id="expression", column=column, operator=operator, value="text")


def _sample_group_config(model: type[GroupConfig]) -> GroupConfig:
    """A grouping by the first groupable column."""
    columns = model.model_fields["field"].annotation
    assert isinstance(columns, type) and issubclass(columns, AbstractColumns)
    column = next(column for column in columns if column.is_groupable())
    return model(field=column)


def _payload_variants() -> list[Any]:
    """One pytest param per event and payload variant: an event whose payload is
    a union (or a list of a union) gets one param per union member."""
    params = []
    for event_type, event_model in DATS_EVENT_TO_MODEL.items():
        annotation = event_model.model_fields["payload"].annotation
        is_list = get_origin(annotation) is list
        members = _union_members(get_args(annotation)[0] if is_list else annotation)
        for member in members:
            payload_type = list[member] if is_list else member
            param_id = event_type.value
            if len(members) > 1:
                param_id += f"-{member.__name__}"
            params.append(pytest.param(event_type, payload_type, id=param_id))
    return params


# ===========================================================================
# FAN-OUT ROUND TRIP TESTS
# ===========================================================================


def test_every_event_is_registered():
    """Every DATSEvent has an event model, so the round trip below covers all
    events (JOB_UPDATED included, which exists only after `register_jobs`)."""
    assert set(DATS_EVENT_TO_MODEL) == set(DATSEvent)


@pytest.mark.parametrize("event_type,payload_type", _payload_variants())
def test_websocket_envelope_survives_fan_out_round_trip(
    event_type: DATSEvent, payload_type: Any
):
    """An envelope serialized to JSON by the publishing worker parses back into an
    equal envelope on the receiving worker, with every payload field intact."""
    envelope = WebSocketEnvelope(
        origin_worker=1,
        kind="all",
        user_ids=None,
        exclude_user_id=None,
        message=DATS_EVENT_TO_MODEL[event_type](
            type=event_type, payload=_sample(payload_type)
        ),
    )

    received = WebSocketEnvelope.model_validate_json(envelope.model_dump_json())

    assert received == envelope
