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
    the provider's errors in a ModelAPIError)."""

    def __init__(self) -> None:
        super().__init__(
            "The underlying LLM inference server encountered an internal error."
        )


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class AgentSessionHistoryInvalidError(Exception):
    """Raised when the stored messages of an agent session cannot be parsed. The
    run is aborted, so the stored history is never overwritten."""

    def __init__(self, session_id: str) -> None:
        super().__init__(f"The history of agent session {session_id} is invalid.")
