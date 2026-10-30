from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class UnknownAgentModelError(Exception):
    """Raised when an agent run requests an LLM that the provider does not serve."""

    def __init__(self, model: str) -> None:
        super().__init__(f"The LLM '{model}' is not available.")


@exception_handler(status.HTTP_502_BAD_GATEWAY)
class AgentLLMError(Exception):
    """Raised when the LLM provider fails while an agent runs (pydantic-ai wraps
    the provider's errors in a ModelAPIError). Names the LLM, so the user can
    pick another one, but not the provider's message."""

    def __init__(self, model: str, status_code: int | None) -> None:
        reason = f" (HTTP {status_code})" if status_code is not None else ""
        super().__init__(
            f"The LLM '{model}' failed to answer{reason}. Try another LLM."
        )


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class AgentSessionHistoryInvalidError(Exception):
    """Raised when the stored messages of an agent session cannot be parsed. The
    run is aborted, so the stored history is never overwritten."""

    def __init__(self, session_id: str) -> None:
        super().__init__(f"The history of agent session {session_id} is invalid.")


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class AgentRunError(Exception):
    """Raised (or sent as an AG-UI run error) when an agent run fails for another
    reason than the LLM provider. The cause is only logged."""

    def __init__(self) -> None:
        super().__init__("The agent failed to answer.")


@exception_handler(status.HTTP_502_BAD_GATEWAY)
class AgentToolUseError(Exception):
    """Raised (or sent as an AG-UI run error) when the LLM keeps calling a tool
    wrongly (pydantic-ai's UnexpectedModelBehavior), e.g. with invalid arguments."""

    def __init__(self) -> None:
        super().__init__(
            "The LLM could not call a tool correctly. Rephrase the request or try another LLM."
        )
