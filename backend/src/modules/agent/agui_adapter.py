from collections.abc import AsyncIterator, Sequence
from functools import cached_property
from typing import Any

from ag_ui.core import BaseEvent, RunAgentInput
from loguru import logger
from pydantic_ai.exceptions import (
    ModelAPIError,
    ModelHTTPError,
    UnexpectedModelBehavior,
)
from pydantic_ai.messages import ToolCallPart
from pydantic_ai.tools import DeferredToolRequests, DeferredToolResults, ToolDenied
from pydantic_ai.ui import UIEventStream
from pydantic_ai.ui.ag_ui import AGUIAdapter, AGUIEventStream

# pydantic-ai's mapping of a pending approval to an AG-UI interrupt (private, so
# pyproject pins the minor version); stored approvals get the same ids as live
# ones, which the client answers by id
from pydantic_ai.ui.ag_ui._interrupt import approval_to_interrupt

from modules.agent.agent_exceptions import (
    AgentLLMError,
    AgentRunError,
    AgentToolUseError,
)

AgentOutput = str | DeferredToolRequests

# The tool result the agent gets for a call the user denied. The frontend shows
# such calls as denied by this text (AgentToolCall.tsx).
TOOL_DENIED_MESSAGE = "The user denied this tool call."


def to_client_error(error: Exception) -> Exception:
    """The error the client sees: LLM failures name the LLM and the HTTP status,
    but never the provider's response, which may contain internals."""
    if isinstance(error, ModelAPIError):
        status_code = error.status_code if isinstance(error, ModelHTTPError) else None
        return AgentLLMError(error.model_name, status_code)
    if isinstance(error, UnexpectedModelBehavior):
        return AgentToolUseError()
    return AgentRunError()


def approval_interrupts(calls: Sequence[ToolCallPart]) -> list[dict[str, Any]]:
    """The AG-UI interrupts (as JSON) of tool calls that wait for the user's approval."""
    return [
        approval_to_interrupt(call, {}).model_dump(by_alias=True, exclude_none=True)
        for call in calls
    ]


class AgentAGUIEventStream(AGUIEventStream[None, AgentOutput]):
    async def on_error(self, error: Exception) -> AsyncIterator[BaseEvent]:
        logger.opt(exception=error).error(f"Agent run failed: {error}")
        async for event in super().on_error(to_client_error(error)):
            yield event


class AgentAGUIAdapter(AGUIAdapter[None, AgentOutput]):
    """Sends errors as `to_client_error` does (pydantic-ai sends `str(error)`), and
    answers denied tool calls with TOOL_DENIED_MESSAGE."""

    def build_event_stream(
        self,
    ) -> UIEventStream[RunAgentInput, BaseEvent, None, AgentOutput]:
        return AgentAGUIEventStream(
            self.run_input, accept=self.accept, ag_ui_version=self.ag_ui_version
        )

    @cached_property
    def deferred_tool_results(self) -> DeferredToolResults | None:
        results = super().deferred_tool_results
        if results is None:
            return None
        return DeferredToolResults(
            calls=results.calls,
            approvals={
                tool_call_id: ToolDenied(message=TOOL_DENIED_MESSAGE)
                if isinstance(approval, ToolDenied) or approval is False
                else approval
                for tool_call_id, approval in results.approvals.items()
            },
            metadata=results.metadata,
        )
