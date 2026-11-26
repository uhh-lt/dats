from common.common_exceptions import NotFoundError


class LLMChatSessionNotFoundError(NotFoundError):
    """Raised for a chat session of another project or user, as if it did not
    exist."""

    def __init__(self, session_id: str) -> None:
        super().__init__(f"Chat session {session_id} does not exist.")
