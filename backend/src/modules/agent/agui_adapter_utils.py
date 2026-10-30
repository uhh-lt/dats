from collections.abc import AsyncIterator, Sequence

from ag_ui.core import BaseEvent, Context, RunAgentInput
from loguru import logger
from pydantic_ai.exceptions import ModelAPIError, ModelHTTPError
from pydantic_ai.tools import DeferredToolRequests
from pydantic_ai.ui import UIEventStream
from pydantic_ai.ui.ag_ui import AGUIAdapter, AGUIEventStream

from modules.agent.agent_exceptions import AgentLLMError, AgentRunError

AgentOutput = str | DeferredToolRequests


def to_client_error(error: Exception) -> Exception:
    """The error the client sees: LLM failures name the LLM and the HTTP status,
    but never the provider's response, which may contain internals."""
    if isinstance(error, ModelAPIError):
        status_code = error.status_code if isinstance(error, ModelHTTPError) else None
        return AgentLLMError(error.model_name, status_code)
    return AgentRunError()


def context_instructions(context: Sequence[Context] | None) -> str | None:
    """The AG-UI context entries of the client (e.g. the project the user works
    in) as instructions for the agent."""
    if not context:
        return None
    return "\n".join(f"{entry.description}: {entry.value}" for entry in context)


class AgentAGUIEventStream(AGUIEventStream[None, AgentOutput]):
    async def on_error(self, error: Exception) -> AsyncIterator[BaseEvent]:
        logger.opt(exception=error).error(f"Agent run failed: {error}")
        async for event in super().on_error(to_client_error(error)):
            yield event


class AgentAGUIAdapter(AGUIAdapter[None, AgentOutput]):
    """Sends errors as `to_client_error` does (pydantic-ai sends `str(error)`)."""

    def build_event_stream(
        self,
    ) -> UIEventStream[RunAgentInput, BaseEvent, None, AgentOutput]:
        return AgentAGUIEventStream(
            self.run_input, accept=self.accept, ag_ui_version=self.ag_ui_version
        )
