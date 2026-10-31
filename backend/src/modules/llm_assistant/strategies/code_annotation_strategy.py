from core.prompt.prompt_dto import PromptCode
from core.prompt.prompt_renderer import PromptRenderer
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy


class CodeAnnotationStrategy(LLMAssistantStrategy):
    """Base class of the strategies that annotate documents with codes.

    The codes are the ones the prompt selects, as they were when it was saved.
    LLM answers are mapped back to code ids by the (case-insensitive) names the
    prompt shows.
    """

    def __init__(self, renderer: PromptRenderer):
        super().__init__(renderer=renderer)
        self.codeid2code: dict[int, PromptCode] = {
            code.code_id: code for code in self.prompt.codes
        }
        self.codename2id = {
            self._normalize_code_name(renderer.render_code_name(code)): code.code_id
            for code in self.prompt.codes
        }

    @staticmethod
    def _normalize_code_name(name: str) -> str:
        """Normalize a code name for case-insensitive matching of LLM answers."""
        return name.strip().upper()

    def _code_id_for_name(self, name: str) -> int | None:
        """Map a code name answered by the LLM to the id of a selected code."""
        return self.codename2id.get(self._normalize_code_name(name))
