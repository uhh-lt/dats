from collections.abc import Sequence

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from modules.llm_assistant.llm_job_dto import (
    AnnotationParams,
    ApproachRecommendation,
    ApproachType,
    LLMJobParameters,
    LLMPromptTemplates,
    MetadataExtractionParams,
    SentenceAnnotationParams,
    StrategyInfo,
    StrategyType,
    TaggingParams,
    TaskType,
)

from .conftest import LLMAssistantProject

PROMPT_TEMPLATES_URL = "/llm/create_prompt_templates"
LIST_STRATEGIES_URL = "/llm/list_strategies"
DETERMINE_APPROACH_URL = "/llm/determine_approach"
COUNT_ANNOTATIONS_URL = "/llm/count_existing_assistant_annotations"


def _job_parameters(
    project: LLMAssistantProject, task_type: TaskType
) -> LLMJobParameters:
    """Build typed endpoint parameters for one assistant task."""
    project_id = project["project"].id
    sdoc_ids = [project["target_sdoc"].id]
    match task_type:
        case TaskType.TAGGING:
            specific = TaggingParams(
                llm_job_type=task_type,
                sdoc_ids=sdoc_ids,
                tag_ids=[project["people_tag"].id, project["other_tag"].id],
            )
        case TaskType.METADATA_EXTRACTION:
            specific = MetadataExtractionParams(
                llm_job_type=task_type,
                sdoc_ids=sdoc_ids,
                project_metadata_ids=[item.id for item in project["metadata_fields"]],
            )
        case TaskType.ANNOTATION:
            specific = AnnotationParams(
                llm_job_type=task_type,
                sdoc_ids=sdoc_ids,
                code_ids=[project["person_code"].id],
            )
        case TaskType.SENTENCE_ANNOTATION:
            specific = SentenceAnnotationParams(
                llm_job_type=task_type,
                sdoc_ids=sdoc_ids,
                code_ids=[project["fact_code"].id],
            )
    return LLMJobParameters(
        project_id=project_id,
        llm_job_type=task_type,
        specific_task_parameters=specific,
    )


def _post_prompt_templates(
    client: TestClient,
    *,
    parameters: LLMJobParameters,
    approach_type: ApproachType,
    strategy_type: StrategyType,
    example_ids: Sequence[int] | None = None,
):
    """Request templates using the endpoint's query and embedded-body contract."""
    return client.post(
        PROMPT_TEMPLATES_URL,
        params={
            "approach_type": approach_type.value,
            "strategy_type": strategy_type.value,
        },
        json={
            "llm_job_params": parameters.model_dump(mode="json"),
            "example_ids": list(example_ids) if example_ids is not None else None,
        },
    )


# ===========================================================================
# LIST STRATEGIES (/llm/list_strategies) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "task_type,expected_strategies",
    [
        # Document tagging has one document-level strategy.
        pytest.param(
            TaskType.TAGGING,
            [(StrategyType.TAGGING_DEFAULT, "Document Tagging", ["<document>"])],
            id="tagging",
        ),
        # Metadata extraction has one document-level strategy.
        pytest.param(
            TaskType.METADATA_EXTRACTION,
            [(StrategyType.METADATA_DEFAULT, "Metadata Extraction", ["<document>"])],
            id="metadata-extraction",
        ),
        # Span annotation exposes both inline and chunked grounding strategies.
        pytest.param(
            TaskType.ANNOTATION,
            [
                (
                    StrategyType.NER_INLINE_TAGS,
                    "Inline Tagging",
                    ["<document>", "<sentence>"],
                ),
                (
                    StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
                    "Context-Anchored Extraction",
                    ["<chunk>"],
                ),
            ],
            id="span-annotation",
        ),
        # Sentence annotation permits document-wide and per-sentence prompts.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            [
                (
                    StrategyType.SENTENCE_ANNOTATION_DEFAULT,
                    "Sentence Annotation",
                    ["<document>", "<sentence>"],
                )
            ],
            id="sentence-annotation",
        ),
    ],
)
def test_list_strategies_returns_every_strategy_and_its_defaults(
    client: TestClient,
    task_type: TaskType,
    expected_strategies: list[tuple[StrategyType, str, list[str]]],
) -> None:
    """Each task returns its exact ordered strategy metadata and default params."""
    response = client.post(LIST_STRATEGIES_URL, params={"task_type": task_type.value})
    assert response.status_code == 200, response.text
    strategies = TypeAdapter(list[StrategyInfo]).validate_python(response.json())

    assert [
        (item.llm_strategy_type, item.name, item.allowed_data_tags)
        for item in strategies
    ] == expected_strategies
    assert all(
        item.default_params.llm_strategy_type == item.llm_strategy_type
        for item in strategies
    )
    assert all(item.description for item in strategies)


def test_list_strategies_rejects_an_unknown_task_type(client: TestClient) -> None:
    """An unknown task enum is rejected by request validation."""
    response = client.post(LIST_STRATEGIES_URL, params={"task_type": "UNKNOWN"})
    assert response.status_code == 422, response.text


# ===========================================================================
# CREATE PROMPT TEMPLATES (/llm/create_prompt_templates) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "task_type,strategy_type,approach_type,expected_data_tag",
    [
        # Tagging supports its default document prompt in zero-shot mode.
        pytest.param(
            TaskType.TAGGING,
            StrategyType.TAGGING_DEFAULT,
            ApproachType.LLM_ZERO_SHOT,
            "<document>",
            id="tagging-zero-shot",
        ),
        # Metadata supports its default document prompt in zero-shot mode.
        pytest.param(
            TaskType.METADATA_EXTRACTION,
            StrategyType.METADATA_DEFAULT,
            ApproachType.LLM_ZERO_SHOT,
            "<document>",
            id="metadata-zero-shot",
        ),
        # Inline span tagging supports zero-shot prompt generation.
        pytest.param(
            TaskType.ANNOTATION,
            StrategyType.NER_INLINE_TAGS,
            ApproachType.LLM_ZERO_SHOT,
            "<sentence>",
            id="inline-zero-shot",
        ),
        # Inline span tagging supports few-shot prompt generation.
        pytest.param(
            TaskType.ANNOTATION,
            StrategyType.NER_INLINE_TAGS,
            ApproachType.LLM_FEW_SHOT,
            "<sentence>",
            id="inline-few-shot",
        ),
        # Fuzzy grounding always uses chunk prompts.
        pytest.param(
            TaskType.ANNOTATION,
            StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            ApproachType.LLM_ZERO_SHOT,
            "<chunk>",
            id="fuzzy-zero-shot",
        ),
        # Fuzzy grounding supports few-shot examples in chunk prompts.
        pytest.param(
            TaskType.ANNOTATION,
            StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            ApproachType.LLM_FEW_SHOT,
            "<chunk>",
            id="fuzzy-few-shot",
        ),
        # Sentence annotation supports its document prompt in zero-shot mode.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            StrategyType.SENTENCE_ANNOTATION_DEFAULT,
            ApproachType.LLM_ZERO_SHOT,
            "<document>",
            id="sentence-zero-shot",
        ),
        # Sentence annotation supports few-shot prompt generation.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            StrategyType.SENTENCE_ANNOTATION_DEFAULT,
            ApproachType.LLM_FEW_SHOT,
            "<document>",
            id="sentence-few-shot",
        ),
    ],
)
def test_create_prompt_templates_covers_task_strategy_and_approach_variants(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
    strategy_type: StrategyType,
    approach_type: ApproachType,
    expected_data_tag: str,
) -> None:
    """Every supported task, strategy, and approach produces both languages."""
    parameters = _job_parameters(llm_assistant_project, task_type)
    response = _post_prompt_templates(
        client,
        parameters=parameters,
        approach_type=approach_type,
        strategy_type=strategy_type,
    )
    assert response.status_code == 200, response.text
    prompts = TypeAdapter(list[LLMPromptTemplates]).validate_python(response.json())

    assert [prompt.language for prompt in prompts] == ["en", "de"]
    assert all(expected_data_tag in prompt.user_prompt for prompt in prompts)
    assert all(prompt.system_prompt and prompt.user_prompt for prompt in prompts)


@pytest.mark.parametrize(
    "strategy_type",
    [
        # Inline-tag examples render the selected human span annotations.
        pytest.param(StrategyType.NER_INLINE_TAGS, id="inline-tags"),
        # Fuzzy examples render the selected human spans as extraction JSON.
        pytest.param(
            StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            id="fuzzy-grounding",
        ),
    ],
)
def test_create_prompt_templates_uses_explicit_span_example_ids(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    strategy_type: StrategyType,
) -> None:
    """Explicit few-shot span IDs appear in both language prompt templates."""
    example = llm_assistant_project["human_span_annotations"][0]
    response = _post_prompt_templates(
        client,
        parameters=_job_parameters(llm_assistant_project, TaskType.ANNOTATION),
        approach_type=ApproachType.LLM_FEW_SHOT,
        strategy_type=strategy_type,
        example_ids=[example.id],
    )
    assert response.status_code == 200, response.text
    prompts = TypeAdapter(list[LLMPromptTemplates]).validate_python(response.json())

    assert len(prompts) == 2
    assert all(example.span_text.text in prompt.user_prompt for prompt in prompts)


def test_create_prompt_templates_uses_explicit_sentence_example_ids(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Explicit sentence examples are included in few-shot sentence prompts."""
    example = llm_assistant_project["human_sentence_annotations"][0]
    response = _post_prompt_templates(
        client,
        parameters=_job_parameters(llm_assistant_project, TaskType.SENTENCE_ANNOTATION),
        approach_type=ApproachType.LLM_FEW_SHOT,
        strategy_type=StrategyType.SENTENCE_ANNOTATION_DEFAULT,
        example_ids=[example.id],
    )
    assert response.status_code == 200, response.text
    prompts = TypeAdapter(list[LLMPromptTemplates]).validate_python(response.json())

    assert all("Anna is a person." in prompt.user_prompt for prompt in prompts)


def test_create_prompt_templates_rejects_an_incompatible_task_and_strategy(
    error_client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """A strategy registered for another task is rejected instead of substituted."""
    response = _post_prompt_templates(
        error_client,
        parameters=_job_parameters(llm_assistant_project, TaskType.TAGGING),
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.NER_INLINE_TAGS,
    )
    assert response.status_code == 500, response.text


def test_create_prompt_templates_rejects_examples_for_zero_shot(
    error_client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Example IDs are invalid when the requested approach is zero-shot."""
    response = _post_prompt_templates(
        error_client,
        parameters=_job_parameters(llm_assistant_project, TaskType.ANNOTATION),
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.NER_INLINE_TAGS,
        example_ids=[llm_assistant_project["human_span_annotations"][0].id],
    )
    assert response.status_code == 500, response.text


@pytest.mark.parametrize(
    "query_update,expected_fragment",
    [
        # The approach query accepts only declared approach enum values.
        pytest.param(
            {"approach_type": "UNKNOWN"},
            "approach_type",
            id="unknown-approach",
        ),
        # The strategy query accepts only declared strategy enum values.
        pytest.param(
            {"strategy_type": "UNKNOWN"},
            "strategy_type",
            id="unknown-strategy",
        ),
    ],
)
def test_create_prompt_templates_rejects_unknown_query_enums(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    query_update: dict[str, str],
    expected_fragment: str,
) -> None:
    """Unknown approach and strategy query values return HTTP 422."""
    query = {
        "approach_type": ApproachType.LLM_ZERO_SHOT.value,
        "strategy_type": StrategyType.NER_INLINE_TAGS.value,
    }
    query.update(query_update)
    response = client.post(
        PROMPT_TEMPLATES_URL,
        params=query,
        json={
            "llm_job_params": _job_parameters(
                llm_assistant_project, TaskType.ANNOTATION
            ).model_dump(mode="json"),
            "example_ids": None,
        },
    )
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text


def test_create_prompt_templates_rejects_foreign_project(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Prompt generation requires membership in the payload project."""
    parameters = _job_parameters(llm_assistant_project, TaskType.ANNOTATION)
    parameters.project_id = llm_assistant_project["foreign_project"].id
    response = _post_prompt_templates(
        client,
        parameters=parameters,
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.NER_INLINE_TAGS,
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# DETERMINE APPROACH (/llm/determine_approach) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "task_type",
    [
        # Tagging currently exposes only zero-shot execution.
        pytest.param(TaskType.TAGGING, id="tagging"),
        # Metadata extraction currently exposes only zero-shot execution.
        pytest.param(TaskType.METADATA_EXTRACTION, id="metadata-extraction"),
    ],
)
def test_determine_approach_returns_zero_shot_for_zero_shot_only_tasks(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
) -> None:
    """Tagging and metadata report zero-shot as their sole available approach."""
    parameters = _job_parameters(llm_assistant_project, task_type)
    response = client.post(
        DETERMINE_APPROACH_URL, json=parameters.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    recommendation = ApproachRecommendation.model_validate(response.json())

    assert recommendation.recommended_approach == ApproachType.LLM_ZERO_SHOT
    assert recommendation.available_approaches == {
        ApproachType.LLM_ZERO_SHOT: True,
        ApproachType.LLM_FEW_SHOT: False,
    }


@pytest.mark.parametrize(
    "task_type",
    [
        # PERSON has exactly four human span examples.
        pytest.param(TaskType.ANNOTATION, id="span-annotation"),
        # FACT has exactly four human sentence examples.
        pytest.param(TaskType.SENTENCE_ANNOTATION, id="sentence-annotation"),
    ],
)
def test_determine_approach_recommends_few_shot_at_the_threshold(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
) -> None:
    """Annotation tasks recommend few-shot when every code reaches the threshold."""
    parameters = _job_parameters(llm_assistant_project, task_type)
    response = client.post(
        DETERMINE_APPROACH_URL, json=parameters.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    recommendation = ApproachRecommendation.model_validate(response.json())

    assert recommendation.recommended_approach == ApproachType.LLM_FEW_SHOT
    assert recommendation.available_approaches == {
        ApproachType.LLM_ZERO_SHOT: True,
        ApproachType.LLM_FEW_SHOT: True,
    }
    if task_type == TaskType.ANNOTATION:
        example_count = len(llm_assistant_project["human_span_annotations"])
    else:
        example_count = len(llm_assistant_project["human_sentence_annotations"])
    assert str(example_count) in recommendation.reasoning


@pytest.mark.parametrize(
    "task_type,code_ids",
    [
        # FACT has no human span annotations, so it keeps span work zero-shot.
        pytest.param(TaskType.ANNOTATION, "fact", id="span-below-threshold"),
        # PERSON has no human sentence annotations, so it keeps sentence work zero-shot.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            "person",
            id="sentence-below-threshold",
        ),
        # The least represented code controls a multi-code span recommendation.
        pytest.param(TaskType.ANNOTATION, "both", id="span-multiple-codes"),
        # The least represented code controls a multi-code sentence recommendation.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            "both",
            id="sentence-multiple-codes",
        ),
    ],
)
def test_determine_approach_uses_the_least_represented_selected_code(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
    code_ids: str,
) -> None:
    """One underrepresented selected code makes few-shot unavailable."""
    ids_by_case = {
        "fact": [llm_assistant_project["fact_code"].id],
        "person": [llm_assistant_project["person_code"].id],
        "both": [
            llm_assistant_project["person_code"].id,
            llm_assistant_project["fact_code"].id,
        ],
    }
    if task_type == TaskType.ANNOTATION:
        specific = AnnotationParams(
            llm_job_type=TaskType.ANNOTATION,
            sdoc_ids=[llm_assistant_project["target_sdoc"].id],
            code_ids=ids_by_case[code_ids],
        )
    else:
        specific = SentenceAnnotationParams(
            llm_job_type=TaskType.SENTENCE_ANNOTATION,
            sdoc_ids=[llm_assistant_project["target_sdoc"].id],
            code_ids=ids_by_case[code_ids],
        )
    parameters = LLMJobParameters(
        project_id=llm_assistant_project["project"].id,
        llm_job_type=task_type,
        specific_task_parameters=specific,
    )
    response = client.post(
        DETERMINE_APPROACH_URL, json=parameters.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    recommendation = ApproachRecommendation.model_validate(response.json())

    assert recommendation.recommended_approach == ApproachType.LLM_ZERO_SHOT
    assert recommendation.available_approaches[ApproachType.LLM_FEW_SHOT] is False
    assert "(0)" in recommendation.reasoning


def test_determine_approach_rejects_foreign_project(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Approach determination requires membership in the payload project."""
    parameters = _job_parameters(llm_assistant_project, TaskType.ANNOTATION)
    parameters.project_id = llm_assistant_project["foreign_project"].id
    response = client.post(
        DETERMINE_APPROACH_URL, json=parameters.model_dump(mode="json")
    )
    assert response.status_code == 403, response.text


def test_determine_approach_rejects_a_mismatched_task_discriminator(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """A task-specific payload with the wrong discriminator returns HTTP 422."""
    parameters = _job_parameters(llm_assistant_project, TaskType.ANNOTATION).model_dump(
        mode="json"
    )
    parameters["specific_task_parameters"]["llm_job_type"] = TaskType.TAGGING.value
    response = client.post(DETERMINE_APPROACH_URL, json=parameters)
    assert response.status_code == 422, response.text
    assert "specific_task_parameters" in response.text


# ===========================================================================
# COUNT EXISTING ANNOTATIONS (/llm/count_existing_assistant_annotations) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "task_type,approach_type,code_key",
    [
        # One zero-shot span annotation exists for PERSON.
        pytest.param(
            TaskType.ANNOTATION,
            ApproachType.LLM_ZERO_SHOT,
            "person_code",
            id="span-zero-shot",
        ),
        # One few-shot span annotation exists for PERSON.
        pytest.param(
            TaskType.ANNOTATION,
            ApproachType.LLM_FEW_SHOT,
            "person_code",
            id="span-few-shot",
        ),
        # One zero-shot sentence annotation exists for FACT.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            ApproachType.LLM_ZERO_SHOT,
            "fact_code",
            id="sentence-zero-shot",
        ),
        # One few-shot sentence annotation exists for FACT.
        pytest.param(
            TaskType.SENTENCE_ANNOTATION,
            ApproachType.LLM_FEW_SHOT,
            "fact_code",
            id="sentence-few-shot",
        ),
    ],
)
def test_count_existing_assistant_annotations_separates_task_and_approach(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
    approach_type: ApproachType,
    code_key: str,
) -> None:
    """Counts include only the selected task's assistant user and documents."""
    code = llm_assistant_project[code_key]
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": task_type.value,
            "approach_type": approach_type.value,
        },
        json={
            "sdoc_ids": [llm_assistant_project["target_sdoc"].id],
            "code_ids": [code.id],
        },
    )
    assert response.status_code == 200, response.text
    counts = TypeAdapter(dict[int, int]).validate_python(response.json())

    assert counts == {code.id: 1}


@pytest.mark.parametrize(
    "task_type",
    [
        # Tagging does not create assistant annotations.
        pytest.param(TaskType.TAGGING, id="tagging"),
        # Metadata extraction does not create assistant annotations.
        pytest.param(TaskType.METADATA_EXTRACTION, id="metadata-extraction"),
    ],
)
def test_count_existing_assistant_annotations_returns_empty_for_other_tasks(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    task_type: TaskType,
) -> None:
    """Non-annotation task types return an empty count mapping."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": task_type.value,
            "approach_type": ApproachType.LLM_ZERO_SHOT.value,
        },
        json={
            "sdoc_ids": [llm_assistant_project["target_sdoc"].id],
            "code_ids": [llm_assistant_project["person_code"].id],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json() == {}


def test_count_existing_assistant_annotations_includes_explicit_zero_counts(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Every requested code is returned even when it has no matching annotations."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "approach_type": ApproachType.LLM_ZERO_SHOT.value,
        },
        json={
            "sdoc_ids": [
                llm_assistant_project["target_sdoc"].id,
                llm_assistant_project["no_match_sdoc"].id,
            ],
            "code_ids": [
                llm_assistant_project["person_code"].id,
                llm_assistant_project["fact_code"].id,
            ],
        },
    )
    assert response.status_code == 200, response.text
    counts = TypeAdapter(dict[int, int]).validate_python(response.json())

    assert counts == {
        llm_assistant_project["person_code"].id: 1,
        llm_assistant_project["fact_code"].id: 0,
    }


@pytest.mark.parametrize(
    "body_update,expected_fragment",
    [
        # Source-document IDs must be a list of integers.
        pytest.param(
            {"sdoc_ids": "not-a-list"},
            "sdoc_ids",
            id="invalid-source-document-ids",
        ),
        # Code IDs must be a list of integers.
        pytest.param(
            {"code_ids": ["not-an-integer"]},
            "code_ids",
            id="invalid-code-ids",
        ),
    ],
)
def test_count_existing_assistant_annotations_rejects_malformed_id_lists(
    client: TestClient,
    body_update: dict[str, object],
    expected_fragment: str,
) -> None:
    """Wrongly typed source-document and code lists return HTTP 422."""
    body: dict[str, object] = {"sdoc_ids": [], "code_ids": []}
    body.update(body_update)
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "approach_type": ApproachType.LLM_ZERO_SHOT.value,
        },
        json=body,
    )
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text


def test_count_existing_assistant_annotations_rejects_foreign_objects(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Annotation counts must not reveal data belonging to another project."""
    response = client.post(
        COUNT_ANNOTATIONS_URL,
        params={
            "task_type": TaskType.ANNOTATION.value,
            "approach_type": ApproachType.LLM_ZERO_SHOT.value,
        },
        json={
            "sdoc_ids": [llm_assistant_project["foreign_sdoc"].id],
            "code_ids": [llm_assistant_project["foreign_code"].id],
        },
    )
    assert response.status_code == 403, response.text
