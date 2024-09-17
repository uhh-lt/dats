from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.dto.llm_job import LLMPromptTemplates

# ENGLISH

en_system_prompt_template = """
You are a system to support the analysis of large amounts of text. You will always answer in the required format and use no other formatting than expected by the user!
"""

# GERMAN

de_system_prompt_template = """
Du bist ein System zur Unterstützung bei der Analyse großer Textmengen. Du antwortest immer in dem geforderten Format und verwendest keine andere Formatierung als vom Benutzer erwartet!
"""


class PromptBuilder:
    """
    Base class for building LLM prompts.
    A system prompt template may contain the placeholders "<project_title>" and "<project_description>".
    A user prompt template must contain the placeholder "<document>".

    A user prompt template always consists of the same building blocks
    1. The task description, e.g. Please classify the documents ...
    2. The categories to work with, e.g. Category 1 - Description 1, Category 2 - Description 2...
    3.1. Instructions on how to answer, e.g. Please answer in this format. The reasoning is optional.
    3.2. A generalized answer tempalte, e.g. Category: <category 1>\n Reasoning: <reasoning>
    3.3. An example answer, e.g. Category: News\n Reasoning: Becase ...
    4. The document to work with
    5. Reiteration of the task, e.g. Remember, you have to classify the document into one of the provided categories, do not generate new categories!

    Consequently, we have the following building blocks:
    <task_description>
    <task_data>
    <answer_instruction>
    <answer_template>
    <answer_example>
    <document>
    <task_reiteration>
    """

    supported_languages = ["en", "de"]
    system_prompt_templates = {
        "en": en_system_prompt_template.strip(),
        "de": de_system_prompt_template.strip(),
    }

    def __init__(self, db: Session, project_id: int):
        project = crud_project.read(db=db, id=project_id)
        self.project_title = project.title
        self.project_description = project.description

    # VALIDATION

    def is_system_prompt_valid(self, system_prompt: str) -> bool:
        return True

    def is_user_prompt_valid(self, user_prompt: str) -> bool:
        if "<document>" in user_prompt:
            return True
        return False

    # PROMPT BUILDING

    def build_system_prompt(self, system_prompt_template: str) -> str:
        system_prompt = system_prompt_template.replace(
            "<project_title>", self.project_title
        )
        return system_prompt.replace("<project_description>", self.project_description)

    def build_user_prompt(self, user_prompt_template: str, document: str) -> str:
        return user_prompt_template.replace("<document>", document)

    # PROMPT TEMPLATE BUILDING

    def _build_system_prompt_template(self, language: str) -> str:
        return self.system_prompt_templates[language]

    def _build_user_prompt_template(self, language: str, **kwargs) -> str:
        raise NotImplementedError()

    def build_prompt_templates(self, **kwargs) -> List[LLMPromptTemplates]:
        # create the prompt templates for all supported languages
        result: List[LLMPromptTemplates] = []
        for language in self.supported_languages:
            result.append(
                LLMPromptTemplates(
                    language=language,
                    system_prompt=self._build_system_prompt_template(language),
                    user_prompt=self._build_user_prompt_template(language, **kwargs),
                )
            )
        return result

    # PARSING

    def parse_response(self, response: str):
        raise NotImplementedError()
