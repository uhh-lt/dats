"""Unit tests for the structured-output schemas of the annotation strategies.

``PromptSettings.request_reasoning`` decides whether every annotation of the
answer has a required ``reasoning`` field; without it (the default) the schema
has no reasoning at all.
"""

from typing import Any

import pytest

from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import PromptCode, PromptSettings, PromptSnapshot
from core.prompt.prompt_enum import OutputFormat, PromptLanguage
from core.prompt.prompt_renderer import PromptRenderer
from core.prompt.prompt_specs import OUTPUT_FORMAT_SPECS
from modules.llm_assistant.strategies.strategy_factory import build_strategy


def _response_schema(
    output_format: OutputFormat, request_reasoning: bool
) -> dict[str, Any]:
    """The schema of the English default prompt of a format with one code."""
    spec = OUTPUT_FORMAT_SPECS[output_format]
    prompt = PromptSnapshot(
        task_type=spec.task_type,
        language=PromptLanguage.EN,
        text=DEFAULT_PROMPTS[output_format][PromptLanguage.EN],
        settings=PromptSettings(request_reasoning=request_reasoning),
        codes=[PromptCode(code_id=1, name="Claim", description="A claim.")],
    )
    renderer = PromptRenderer(
        prompt=prompt,
        document_unit=spec.default_document_unit,
        output_format=output_format,
    )
    return build_strategy(renderer).get_response_model().model_json_schema()


def _objects(schema: dict[str, Any]) -> list[dict[str, Any]]:
    """The schema and all object schemas it defines."""
    return [schema, *schema.get("$defs", {}).values()]


@pytest.mark.parametrize(
    "output_format,annotation_fields",
    [
        # Inline tags: one reasoning per tagged passage, next to the tagged text.
        pytest.param(OutputFormat.INLINE, {"passage", "reasoning"}, id="inline"),
        # Quotes with context: every passage has a reasoning.
        pytest.param(
            OutputFormat.CONTEXT,
            {
                "category",
                "exact_quote",
                "context_before",
                "context_after",
                "reasoning",
            },
            id="context",
        ),
        # Sentences: every classified sentence has a reasoning.
        pytest.param(
            OutputFormat.SENTENCES,
            {"sent_id", "category", "reasoning"},
            id="sentences",
        ),
    ],
)
def test_response_schema_requires_a_reasoning_per_annotation_only_when_requested(
    output_format: OutputFormat, annotation_fields: set[str]
) -> None:
    """With the setting, the annotation objects require a string ``reasoning``;
    without it, no object of the schema has a reasoning field."""
    with_reasoning = _response_schema(output_format, request_reasoning=True)
    without_reasoning = _response_schema(output_format, request_reasoning=False)

    reasoning_objects = [
        obj
        for obj in _objects(with_reasoning)
        if "reasoning" in obj.get("properties", {})
    ]
    assert len(reasoning_objects) == 1
    annotation = reasoning_objects[0]
    assert set(annotation["properties"]) == annotation_fields
    assert set(annotation["required"]) == annotation_fields
    assert annotation["properties"]["reasoning"]["type"] == "string"

    assert all(
        "reasoning" not in obj.get("properties", {})
        for obj in _objects(without_reasoning)
    )
