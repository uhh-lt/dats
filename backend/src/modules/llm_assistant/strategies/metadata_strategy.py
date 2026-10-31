import json
from typing import Any

from loguru import logger
from pydantic import BaseModel, Field, create_model

from common.meta_type_enum import MetaType
from core.prompt.prompt_enum import OutputFormat
from core.prompt.prompt_renderer import PromptRenderer
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy

# the Python type of the answer of each metadata type
_TYPE_MAPPING: dict[MetaType, type] = {
    MetaType.STRING: str,
    MetaType.NUMBER: int,
    MetaType.DATE: str,
    MetaType.BOOLEAN: bool,
    MetaType.LIST: list[str],
}


class MetadataStrategy(LLMAssistantStrategy):
    """Metadata extraction (<output-format:metadata>): one value per selected field."""

    output_format = OutputFormat.METADATA

    def __init__(self, renderer: PromptRenderer):
        super().__init__(renderer=renderer)
        self.metadataname2id = {
            field.key.lower(): field.project_metadata_id
            for field in self.prompt.metadata_fields
        }
        self.output_model = self._generate_dynamic_model()
        logger.info(
            "Generated Dynamic Model Schema: \n{}",
            json.dumps(self.output_model.model_json_schema(), indent=2),
        )

    def get_response_model(self) -> type[BaseModel]:
        return self.output_model

    def _generate_dynamic_model(self) -> type[BaseModel]:
        """Create a Pydantic response model containing the selected metadata fields."""
        fields: dict[str, Any] = {
            field.key: (
                _TYPE_MAPPING.get(field.metatype, str) | None,
                Field(description=field.description),
            )
            for field in self.prompt.metadata_fields
        }
        return create_model("DynamicMetadataExtraction", **fields, __base__=BaseModel)

    def parse_result(self, result: BaseModel) -> dict[int, Any]:
        """Return the extracted values by project metadata id."""
        return {
            self.metadataname2id[key.lower()]: value
            for key, value in result.model_dump(exclude_none=True).items()
            if key.lower() in self.metadataname2id
        }
