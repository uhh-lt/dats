import time
from collections.abc import Sequence

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.user.user_crud import ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID
from modules.llm_assistant.llm_job_dto import (
    AnnotationLLMJobResult,
    AnnotationParams,
    ApproachType,
    DefaultStrategyParams,
    FewShotParams,
    FuzzyGroundingStrategyParams,
    LLMJobInput,
    LLMJobOutput,
    LLMPromptTemplates,
    MetadataExtractionLLMJobResult,
    MetadataExtractionParams,
    NERInlineTagStrategyParams,
    SentenceAnnotationLLMJobResult,
    SentenceAnnotationParams,
    StrategyType,
    TaggingLLMJobResult,
    TaggingParams,
    TaskType,
    ZeroShotParams,
)
from systems.job_system.job_dto import JobRead, JobStatus

from .conftest import LLMAssistantProject, UnusualCodeNamesProject

LLM_JOB_URL = "/llm/llm_assistant"
PROMPT_TEMPLATES_URL = "/llm/create_prompt_templates"
LLMJobRead = JobRead[LLMJobInput, LLMJobOutput]


def _wait_for_status(
    client: TestClient,
    job_id: str,
    expected_status: JobStatus,
    *,
    timeout: float = 180.0,
    poll_interval: float = 0.5,
) -> LLMJobRead:
    """Poll one assistant job until the expected or another terminal status occurs."""
    deadline = time.monotonic() + timeout
    terminal_statuses = {
        JobStatus.FINISHED,
        JobStatus.FAILED,
        JobStatus.STOPPED,
        JobStatus.CANCELED,
    }
    while True:
        response = client.get(f"{LLM_JOB_URL}/{job_id}")
        assert response.status_code == 200, response.text
        job = LLMJobRead.model_validate(response.json())
        if job.status == expected_status:
            return job
        if job.status in terminal_statuses:
            pytest.fail(
                f"LLM assistant job {job_id} ended with status {job.status.value}; "
                f"expected {expected_status.value}: {job.status_message}"
            )
        if time.monotonic() > deadline:
            pytest.fail(
                f"LLM assistant job {job_id} did not reach {expected_status.value} "
                f"within {timeout}s (last status: {job.status.value}, "
                f"message: {job.status_message})"
            )
        time.sleep(poll_interval)


def _start_job(client: TestClient, payload: LLMJobInput) -> LLMJobRead:
    """Start a typed assistant job and validate its initial endpoint response."""
    response = client.post(LLM_JOB_URL, json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    job = LLMJobRead.model_validate(response.json())
    assert job.job_type == "llm_assistant"
    assert job.project_id == payload.project_id
    assert job.input == payload
    assert job.status in {
        JobStatus.QUEUED,
        JobStatus.STARTED,
        JobStatus.FINISHED,
        JobStatus.FAILED,
    }
    return job


def _prompt_templates(
    client: TestClient,
    *,
    project_id: int,
    task_parameters: (
        TaggingParams
        | MetadataExtractionParams
        | AnnotationParams
        | SentenceAnnotationParams
    ),
    approach_type: ApproachType,
    strategy_type: StrategyType,
    example_ids: Sequence[int] | None = None,
) -> list[LLMPromptTemplates]:
    """Obtain prompts through the public endpoint for use in a job payload."""
    response = client.post(
        PROMPT_TEMPLATES_URL,
        params={
            "approach_type": approach_type.value,
            "strategy_type": strategy_type.value,
        },
        json={
            "llm_job_params": {
                "project_id": project_id,
                "llm_job_type": task_parameters.llm_job_type.value,
                "specific_task_parameters": task_parameters.model_dump(mode="json"),
            },
            "example_ids": list(example_ids) if example_ids is not None else None,
        },
    )
    assert response.status_code == 200, response.text
    return TypeAdapter(list[LLMPromptTemplates]).validate_python(response.json())


def _replace_data_tag(
    prompts: list[LLMPromptTemplates], old: str, new: str
) -> list[LLMPromptTemplates]:
    """Return prompt copies using another strategy-supported data placeholder."""
    return [
        prompt.model_copy(update={"user_prompt": prompt.user_prompt.replace(old, new)})
        for prompt in prompts
    ]


def _approach_parameters(
    approach_type: ApproachType,
    prompts: list[LLMPromptTemplates],
    model: str = "default",
) -> ZeroShotParams | FewShotParams:
    """Build the discriminated approach parameters used by job payloads."""
    if approach_type == ApproachType.LLM_FEW_SHOT:
        return FewShotParams(
            llm_approach_type=approach_type,
            prompts=prompts,
            model=model,
        )
    return ZeroShotParams(
        llm_approach_type=approach_type,
        prompts=prompts,
        model=model,
    )


def _tagging_payload(
    client: TestClient,
    project: LLMAssistantProject,
    *,
    model: str = "default",
) -> LLMJobInput:
    """Build a zero-shot tagging job through the prompt-template workflow."""
    task_parameters = TaggingParams(
        llm_job_type=TaskType.TAGGING,
        sdoc_ids=[project["target_sdoc"].id],
        tag_ids=[project["people_tag"].id, project["other_tag"].id],
    )
    prompts = _prompt_templates(
        client,
        project_id=project["project"].id,
        task_parameters=task_parameters,
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.TAGGING_DEFAULT,
    )
    return LLMJobInput(
        project_id=project["project"].id,
        llm_job_type=TaskType.TAGGING,
        specific_task_parameters=task_parameters,
        llm_approach_type=ApproachType.LLM_ZERO_SHOT,
        specific_approach_parameters=_approach_parameters(
            ApproachType.LLM_ZERO_SHOT, prompts, model
        ),
        llm_strategy_type=StrategyType.TAGGING_DEFAULT,
        specific_strategy_parameters=DefaultStrategyParams(
            llm_strategy_type=StrategyType.TAGGING_DEFAULT
        ),
    )


def _metadata_payload(client: TestClient, project: LLMAssistantProject) -> LLMJobInput:
    """Build a zero-shot metadata job covering every supported metadata type."""
    task_parameters = MetadataExtractionParams(
        llm_job_type=TaskType.METADATA_EXTRACTION,
        sdoc_ids=[project["target_sdoc"].id],
        project_metadata_ids=[item.id for item in project["metadata_fields"]],
    )
    prompts = _prompt_templates(
        client,
        project_id=project["project"].id,
        task_parameters=task_parameters,
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.METADATA_DEFAULT,
    )
    return LLMJobInput(
        project_id=project["project"].id,
        llm_job_type=TaskType.METADATA_EXTRACTION,
        specific_task_parameters=task_parameters,
        llm_approach_type=ApproachType.LLM_ZERO_SHOT,
        specific_approach_parameters=_approach_parameters(
            ApproachType.LLM_ZERO_SHOT, prompts
        ),
        llm_strategy_type=StrategyType.METADATA_DEFAULT,
        specific_strategy_parameters=DefaultStrategyParams(
            llm_strategy_type=StrategyType.METADATA_DEFAULT
        ),
    )


def _annotation_payload(
    client: TestClient,
    project: LLMAssistantProject,
    *,
    approach_type: ApproachType,
    strategy_type: StrategyType,
    data_tag: str,
    use_small_overlapping_chunks: bool = False,
) -> LLMJobInput:
    """Build one span-annotation job variant through public prompt generation."""
    task_parameters = AnnotationParams(
        llm_job_type=TaskType.ANNOTATION,
        sdoc_ids=[project["target_sdoc"].id],
        code_ids=[project["person_code"].id],
        delete_existing_annotations=True,
    )
    prompts = _prompt_templates(
        client,
        project_id=project["project"].id,
        task_parameters=task_parameters,
        approach_type=approach_type,
        strategy_type=strategy_type,
    )
    if strategy_type == StrategyType.NER_INLINE_TAGS:
        current_data_tag = "<sentence>"
        if data_tag != current_data_tag:
            prompts = _replace_data_tag(prompts, current_data_tag, data_tag)
        strategy_parameters = NERInlineTagStrategyParams(
            llm_strategy_type=StrategyType.NER_INLINE_TAGS
        )
    else:
        strategy_parameters = FuzzyGroundingStrategyParams(
            llm_strategy_type=StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            chunk_size_tokens=4 if use_small_overlapping_chunks else 650,
            chunk_overlap_tokens=2 if use_small_overlapping_chunks else 100,
            fuzzy_threshold=0.85,
            context_before_chars=32,
            context_after_chars=32,
        )
    return LLMJobInput(
        project_id=project["project"].id,
        llm_job_type=TaskType.ANNOTATION,
        specific_task_parameters=task_parameters,
        llm_approach_type=approach_type,
        specific_approach_parameters=_approach_parameters(approach_type, prompts),
        llm_strategy_type=strategy_type,
        specific_strategy_parameters=strategy_parameters,
    )


def _sentence_annotation_payload(
    client: TestClient,
    project: LLMAssistantProject,
    *,
    approach_type: ApproachType,
    data_tag: str,
) -> LLMJobInput:
    """Build one sentence-annotation job variant through public prompt generation."""
    task_parameters = SentenceAnnotationParams(
        llm_job_type=TaskType.SENTENCE_ANNOTATION,
        sdoc_ids=[project["target_sdoc"].id],
        code_ids=[project["fact_code"].id],
        delete_existing_annotations=True,
    )
    prompts = _prompt_templates(
        client,
        project_id=project["project"].id,
        task_parameters=task_parameters,
        approach_type=approach_type,
        strategy_type=StrategyType.SENTENCE_ANNOTATION_DEFAULT,
    )
    if data_tag != "<document>":
        prompts = _replace_data_tag(prompts, "<document>", data_tag)
    return LLMJobInput(
        project_id=project["project"].id,
        llm_job_type=TaskType.SENTENCE_ANNOTATION,
        specific_task_parameters=task_parameters,
        llm_approach_type=approach_type,
        specific_approach_parameters=_approach_parameters(approach_type, prompts),
        llm_strategy_type=StrategyType.SENTENCE_ANNOTATION_DEFAULT,
        specific_strategy_parameters=DefaultStrategyParams(
            llm_strategy_type=StrategyType.SENTENCE_ANNOTATION_DEFAULT
        ),
    )


# ===========================================================================
# START/GET LLM ASSISTANT JOB (/llm/llm_assistant) TESTS
# ===========================================================================


def test_tagging_job_returns_current_and_exact_suggested_tags(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """A real zero-shot tagging job classifies the explicit person document."""
    started = _start_job(client, _tagging_payload(client, llm_assistant_project))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.llm_job_type == TaskType.TAGGING
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, TaggingLLMJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.sdoc_id == llm_assistant_project["target_sdoc"].id
    assert result.current_tag_ids == [llm_assistant_project["other_tag"].id]
    assert result.suggested_tag_ids == [llm_assistant_project["people_tag"].id]
    assert result.reasoning


def test_metadata_job_extracts_all_supported_value_types(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """A real metadata job extracts string, number, date, boolean, and list values."""
    started = _start_job(client, _metadata_payload(client, llm_assistant_project))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.llm_job_type == TaskType.METADATA_EXTRACTION
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, MetadataExtractionLLMJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.sdoc_id == llm_assistant_project["target_sdoc"].id
    assert len(result.current_metadata) == 5
    values = {
        item.project_metadata.key: item.get_value_serializable()
        for item in result.suggested_metadata
    }
    assert values == {
        "author": "Alice",
        "year": 2024,
        "published": "2024-01-15T00:00:00",
        "reviewed": True,
        "topics": ["solar", "energy"],
    }


@pytest.mark.parametrize(
    "approach_type,strategy_type,data_tag,use_small_overlapping_chunks",
    [
        # Inline tagging processes the full target document in one prompt.
        pytest.param(
            ApproachType.LLM_ZERO_SHOT,
            StrategyType.NER_INLINE_TAGS,
            "<document>",
            False,
            id="inline-zero-shot-document",
        ),
        # Few-shot inline tagging generates one prompt per sentence.
        pytest.param(
            ApproachType.LLM_FEW_SHOT,
            StrategyType.NER_INLINE_TAGS,
            "<sentence>",
            False,
            id="inline-few-shot-sentences",
        ),
        # Small overlapping chunks exercise multiple batched requests and deduplication.
        pytest.param(
            ApproachType.LLM_ZERO_SHOT,
            StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            "<chunk>",
            True,
            id="fuzzy-zero-shot-overlapping-chunks",
        ),
        # Few-shot fuzzy grounding exercises rendered examples with normal chunking.
        pytest.param(
            ApproachType.LLM_FEW_SHOT,
            StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
            "<chunk>",
            False,
            id="fuzzy-few-shot",
        ),
    ],
)
def test_span_annotation_job_covers_all_approaches_strategies_and_data_tags(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    approach_type: ApproachType,
    strategy_type: StrategyType,
    data_tag: str,
    use_small_overlapping_chunks: bool,
) -> None:
    """Every span variant persists one deduplicated PERSON suggestion for Alice."""
    payload = _annotation_payload(
        client,
        llm_assistant_project,
        approach_type=approach_type,
        strategy_type=strategy_type,
        data_tag=data_tag,
        use_small_overlapping_chunks=use_small_overlapping_chunks,
    )
    started = _start_job(client, payload)
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.llm_job_type == TaskType.ANNOTATION
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, AnnotationLLMJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.raw_response is None
    assert result.sdoc_id == llm_assistant_project["target_sdoc"].id
    assistant_user_id = (
        ASSISTANT_FEWSHOT_ID
        if approach_type == ApproachType.LLM_FEW_SHOT
        else ASSISTANT_ZEROSHOT_ID
    )
    suggestions = [
        (annotation.text, annotation.code_id, annotation.user_id)
        for annotation in result.suggested_annotations
    ]
    assert suggestions == [
        (
            "Alice",
            llm_assistant_project["person_code"].id,
            assistant_user_id,
        )
    ]


def test_inline_tag_annotation_job_supports_unusual_code_names(
    client: TestClient,
    unusual_code_names_project: UnusualCodeNamesProject,
) -> None:
    """Inline tags preserve annotations and offsets for unrestricted code names."""
    codes = unusual_code_names_project["codes"]
    task_parameters = AnnotationParams(
        llm_job_type=TaskType.ANNOTATION,
        sdoc_ids=[unusual_code_names_project["target_sdoc"].id],
        code_ids=[code.id for code in codes],
        delete_existing_annotations=True,
    )
    prompts = _prompt_templates(
        client,
        project_id=unusual_code_names_project["project"].id,
        task_parameters=task_parameters,
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.NER_INLINE_TAGS,
    )
    payload = LLMJobInput(
        project_id=unusual_code_names_project["project"].id,
        llm_job_type=TaskType.ANNOTATION,
        specific_task_parameters=task_parameters,
        llm_approach_type=ApproachType.LLM_ZERO_SHOT,
        specific_approach_parameters=_approach_parameters(
            ApproachType.LLM_ZERO_SHOT,
            prompts,
        ),
        llm_strategy_type=StrategyType.NER_INLINE_TAGS,
        specific_strategy_parameters=NERInlineTagStrategyParams(
            llm_strategy_type=StrategyType.NER_INLINE_TAGS
        ),
    )

    started = _start_job(client, payload)
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, AnnotationLLMJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    suggestions = [
        (
            annotation.text,
            annotation.code_id,
            annotation.begin,
            annotation.end,
        )
        for annotation in result.suggested_annotations
    ]
    assert suggestions == unusual_code_names_project["expected_annotations"]


@pytest.mark.parametrize(
    "approach_type,data_tag,expected_ranges",
    [
        # Document mode merges consecutive FACT sentences into one range.
        pytest.param(
            ApproachType.LLM_ZERO_SHOT,
            "<document>",
            [(0, 4)],
            id="zero-shot-document",
        ),
        # Per-sentence mode produces one independently processed range per prompt.
        pytest.param(
            ApproachType.LLM_ZERO_SHOT,
            "<sentence>",
            [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)],
            id="zero-shot-sentences",
        ),
        # Few-shot document mode uses the four human sentence examples.
        pytest.param(
            ApproachType.LLM_FEW_SHOT,
            "<document>",
            [(0, 4)],
            id="few-shot-document",
        ),
    ],
)
def test_sentence_annotation_job_covers_approaches_and_data_tags(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    approach_type: ApproachType,
    data_tag: str,
    expected_ranges: list[tuple[int, int]],
) -> None:
    """Sentence jobs persist exact FACT ranges without duplicate suggestions."""
    payload = _sentence_annotation_payload(
        client,
        llm_assistant_project,
        approach_type=approach_type,
        data_tag=data_tag,
    )
    started = _start_job(client, payload)
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.llm_job_type == TaskType.SENTENCE_ANNOTATION
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, SentenceAnnotationLLMJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.raw_response is None
    assert result.sdoc_id == llm_assistant_project["target_sdoc"].id
    assistant_user_id = (
        ASSISTANT_FEWSHOT_ID
        if approach_type == ApproachType.LLM_FEW_SHOT
        else ASSISTANT_ZEROSHOT_ID
    )
    suggestions = [
        (
            annotation.sentence_id_start,
            annotation.sentence_id_end,
            annotation.code_id,
            annotation.user_id,
        )
        for annotation in result.suggested_annotations
    ]
    assert suggestions == [
        (
            start,
            end,
            llm_assistant_project["fact_code"].id,
            assistant_user_id,
        )
        for start, end in expected_ranges
    ]


# ===========================================================================
# JOB MANAGEMENT ENDPOINT TESTS
# ===========================================================================


def test_finished_job_can_be_read_listed_but_not_aborted_or_retried(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Get, project-list, abort, and retry expose consistent finished-job state."""
    started = _start_job(client, _tagging_payload(client, llm_assistant_project))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    list_response = client.get(
        f"{LLM_JOB_URL}/project/{llm_assistant_project['project'].id}"
    )
    assert list_response.status_code == 200, list_response.text
    jobs = TypeAdapter(list[LLMJobRead]).validate_python(list_response.json())
    assert [job.job_id for job in jobs] == [finished.job_id]
    assert jobs[0].status == JobStatus.FINISHED

    abort_response = client.post(f"{LLM_JOB_URL}/{finished.job_id}/abort")
    assert abort_response.status_code == 200, abort_response.text
    assert abort_response.json() is False

    retry_response = client.post(f"{LLM_JOB_URL}/{finished.job_id}/retry")
    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json() is False


def test_failed_job_can_be_retried_and_fails_again_with_the_same_invalid_model(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Retry requeues a failed job while preserving its typed invalid input."""
    payload = _tagging_payload(
        client, llm_assistant_project, model="definitely-not-an-available-model"
    )
    started = _start_job(client, payload)
    failed = _wait_for_status(client, started.job_id, JobStatus.FAILED)
    assert failed.output is None

    retry_response = client.post(f"{LLM_JOB_URL}/{failed.job_id}/retry")
    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json() is True

    failed_again = _wait_for_status(client, failed.job_id, JobStatus.FAILED)
    assert failed_again.input == payload
    assert failed_again.output is None


@pytest.mark.parametrize(
    "suffix",
    [
        # Reading an unknown job returns the registered not-found response.
        pytest.param("", id="get"),
        # Aborting an unknown job returns the registered not-found response.
        pytest.param("/abort", id="abort"),
        # Retrying an unknown job returns the registered not-found response.
        pytest.param("/retry", id="retry"),
    ],
)
def test_job_management_rejects_nonexistent_job_ids(
    client: TestClient, suffix: str
) -> None:
    """Every single-job management route returns HTTP 404 for an unknown ID."""
    method = client.get if suffix == "" else client.post
    response = method(f"{LLM_JOB_URL}/not-a-real-job{suffix}")
    assert response.status_code == 404, response.text


def test_job_start_and_project_list_reject_foreign_project(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Both job creation and project listing require project membership."""
    payload = _tagging_payload(client, llm_assistant_project)
    foreign_payload = payload.model_copy(
        update={"project_id": llm_assistant_project["foreign_project"].id}
    )
    start_response = client.post(
        LLM_JOB_URL, json=foreign_payload.model_dump(mode="json")
    )
    assert start_response.status_code == 403, start_response.text

    list_response = client.get(
        f"{LLM_JOB_URL}/project/{llm_assistant_project['foreign_project'].id}"
    )
    assert list_response.status_code == 403, list_response.text


# --- Invalid job payload contracts -----------------------------------------


@pytest.mark.parametrize(
    "payload_update,expected_fragment",
    [
        # The outer task discriminator accepts only declared task enum values.
        pytest.param(
            {"llm_job_type": "UNKNOWN"},
            "llm_job_type",
            id="unknown-task",
        ),
        # The strategy discriminator accepts only declared strategy enum values.
        pytest.param(
            {"llm_strategy_type": "UNKNOWN"},
            "llm_strategy_type",
            id="unknown-strategy",
        ),
        # A job cannot omit its task-specific discriminated payload.
        pytest.param(
            {"specific_task_parameters": None},
            "specific_task_parameters",
            id="missing-specific-task-parameters",
        ),
        # A job cannot omit its approach-specific discriminated payload.
        pytest.param(
            {"specific_approach_parameters": None},
            "specific_approach_parameters",
            id="missing-specific-approach-parameters",
        ),
        # A job cannot omit its strategy-specific discriminated payload.
        pytest.param(
            {"specific_strategy_parameters": None},
            "specific_strategy_parameters",
            id="missing-specific-strategy-parameters",
        ),
    ],
)
def test_job_start_rejects_malformed_discriminated_payloads(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    payload_update: dict[str, object],
    expected_fragment: str,
) -> None:
    """Malformed task, approach, and strategy discriminators return HTTP 422."""
    payload = _tagging_payload(client, llm_assistant_project).model_dump(mode="json")
    payload.update(payload_update)
    response = client.post(LLM_JOB_URL, json=payload)
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text


@pytest.mark.parametrize(
    "strategy_update,expected_fragment",
    [
        # Similarity must be in the inclusive zero-to-one interval.
        pytest.param(
            {"fuzzy_threshold": 1.1},
            "fuzzy_threshold",
            id="fuzzy-threshold-above-one",
        ),
        # Chunk size must be positive.
        pytest.param(
            {"chunk_size_tokens": 0},
            "chunk_size_tokens",
            id="zero-chunk-size",
        ),
        # Chunk overlap cannot be negative.
        pytest.param(
            {"chunk_overlap_tokens": -1},
            "chunk_overlap_tokens",
            id="negative-chunk-overlap",
        ),
        # Chunk overlap must remain strictly smaller than chunk size.
        pytest.param(
            {"chunk_size_tokens": 10, "chunk_overlap_tokens": 10},
            "Chunk overlap must be smaller than chunk size",
            id="overlap-equals-size",
        ),
    ],
)
def test_job_start_rejects_invalid_fuzzy_strategy_parameters(
    client: TestClient,
    llm_assistant_project: LLMAssistantProject,
    strategy_update: dict[str, object],
    expected_fragment: str,
) -> None:
    """Every fuzzy threshold and chunk boundary is enforced at the HTTP boundary."""
    payload = _annotation_payload(
        client,
        llm_assistant_project,
        approach_type=ApproachType.LLM_ZERO_SHOT,
        strategy_type=StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING,
        data_tag="<chunk>",
    ).model_dump(mode="json")
    strategy_parameters = payload["specific_strategy_parameters"]
    assert isinstance(strategy_parameters, dict)
    strategy_parameters.update(strategy_update)

    response = client.post(LLM_JOB_URL, json=payload)
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text
