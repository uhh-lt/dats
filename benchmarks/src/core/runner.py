import asyncio
import logging
from importlib import import_module
from pathlib import Path
from typing import Any, Sequence
from uuid import uuid4

import pandas as pd
from jinja2 import Environment, FileSystemLoader
from pydantic import ValidationError

from core.docker_manager import managed_vllm_container
from core.llm_client import run_batch_inference
from core.logger import log_experiment_to_mlflow
from evaluation.artifact_registry import get_artifact_builders
from evaluation.metric_registry import get_metric_evaluators
from schemas.answer_schema import BaseAnswerSchema
from schemas.config_schema import (
    DatasetConfig,
    RunConfig,
)
from schemas.reference_schema import BaseReferenceSchema

logger = logging.getLogger(__name__)


def _load_schema(schema_ref: str) -> type[BaseAnswerSchema]:
    schema_module_name, schema_class_name = schema_ref.rsplit(".", 1)
    import_name = (
        schema_module_name
        if schema_module_name.startswith("schemas.")
        else f"schemas.{schema_module_name}"
    )
    module = import_module(import_name)
    schema_class = getattr(module, schema_class_name)

    if not issubclass(schema_class, BaseAnswerSchema):
        raise TypeError(
            f"Schema '{schema_ref}' must inherit from BaseAnswerSchema and implement get_prediction()."
        )

    return schema_class


def _render_prompts(
    df: pd.DataFrame,
    template_dir: Path,
    template_name: str,
    dataset_config: DatasetConfig,
    prompt_variables: dict[str, Any],
) -> list[str]:
    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=False)
    template = env.get_template(template_name)

    prompts: list[str] = []
    for _, row in df.iterrows():
        row_data = {str(key): value for key, value in row.to_dict().items()}
        row_context = dataset_config.build_prompt_row_context(row_data)
        row_context.update(prompt_variables)
        prompts.append(template.render(**row_context))

    return prompts


def _render_system_prompt(
    template_path: Path,
    template_variables: dict[str, Any],
) -> str:
    env = Environment(
        loader=FileSystemLoader(str(template_path.parent)),
        autoescape=False,
    )
    template = env.get_template(template_path.name)
    return template.render(**template_variables)


def _parse_responses(
    raw_responses: list[str],
    schema_class: type[BaseAnswerSchema],
) -> tuple[list[BaseAnswerSchema | None], list[bool], dict[int, str]]:
    parsed_objects: list[BaseAnswerSchema | None] = []
    valid_flags: list[bool] = []
    parse_errors: dict[int, str] = {}

    for idx, response in enumerate(raw_responses):
        try:
            parsed_objects.append(schema_class.model_validate_json(response))
            valid_flags.append(True)
        except ValidationError as exc:
            parsed_objects.append(None)
            valid_flags.append(False)
            parse_errors[idx] = str(exc)

    return parsed_objects, valid_flags, parse_errors


def run_experiment(run_config: RunConfig) -> dict[str, Any]:
    experiment_config = run_config.experiment
    dataset_config = experiment_config.dataset
    model_config = experiment_config.model
    backend_config = run_config.backend

    logger.info(
        "Loading dataset '%s' from %s",
        dataset_config.name,
        dataset_config.path,
    )
    if dataset_config.path.suffix == ".csv":
        df = pd.read_csv(dataset_config.path)
    elif dataset_config.path.suffix == ".parquet":
        df = pd.read_parquet(dataset_config.path)
    else:
        raise ValueError(
            f"Unsupported dataset format: {dataset_config.path.suffix}. Supported formats are .csv and .parquet."
        )

    logger.info("Dataset loaded with %d rows", len(df))

    if experiment_config.max_examples:
        target_size = min(len(df), experiment_config.max_examples)
        if experiment_config.sample_randomly:
            df = df.sample(
                n=target_size,
                random_state=experiment_config.sample_random_state,
            ).copy()
            logger.info(
                "Applying max_examples=%d with random sampling (seed=%d) -> %d rows",
                experiment_config.max_examples,
                experiment_config.sample_random_state,
                len(df),
            )
        else:
            df = df.head(target_size).copy()
            logger.info(
                "Applying max_examples=%d -> %d rows",
                experiment_config.max_examples,
                len(df),
            )

    references = dataset_config.get_references(df)

    logger.info(
        "Rendering prompts using template %s", experiment_config.prompt_template
    )
    prompts = _render_prompts(
        df=df,
        template_dir=experiment_config.prompt_template.parent,
        template_name=experiment_config.prompt_template.name,
        dataset_config=dataset_config,
        prompt_variables=experiment_config.prompt_variables,
    )

    print("Example rendered prompts:")
    for i, prompt in enumerate(prompts[:3], start=1):
        print(f"Prompt {i}:\n{prompt}\n{'-' * 60}")

    system_prompt: str | None = None
    if experiment_config.system_prompt_template:
        logger.info(
            "Rendering system prompt using template %s",
            experiment_config.system_prompt_template,
        )
        system_prompt = _render_system_prompt(
            template_path=experiment_config.system_prompt_template,
            template_variables=experiment_config.system_prompt_variables,
        )

        print(f"Rendered system prompt:\n{system_prompt}\n{'-' * 60}")

    schema_class = _load_schema(experiment_config.schema_ref)
    logger.info("Loaded output schema %s", experiment_config.schema_ref)

    logger.info("Starting vLLM Docker container for model %s", model_config.name)
    with managed_vllm_container(
        model_config=model_config,
        vllm_backend_config=backend_config,
    ) as base_url:
        logger.info("vLLM container is healthy at %s", base_url)
        logger.info("Running batch inference for %d prompts", len(prompts))
        raw_responses = asyncio.run(
            run_batch_inference(
                prompts=prompts,
                system_prompt=system_prompt,
                schema=schema_class,
                model_alias=model_config.alias,
                base_url=base_url,
                api_key=backend_config.api_key,
                concurrency=backend_config.concurrency,
                temperature=experiment_config.temperature,
            )
        )

    parsed_responses, valid_flags, parse_errors = _parse_responses(
        raw_responses, schema_class
    )

    if parse_errors and run_config.fail_on_parse_error:
        raise RuntimeError(
            f"Schema validation failed for {len(parse_errors)} response(s)."
        )

    logger.info("Computing metrics: %s", experiment_config.metrics)
    evaluators = get_metric_evaluators(metric_names=experiment_config.metrics)

    all_metrics: dict[str, float] = {}
    for evaluator in evaluators:
        all_metrics.update(
            evaluator.compute(predictions=parsed_responses, references=references)
        )
    all_metrics["parse_error_rate"] = (
        0.0
        if not valid_flags
        else 1.0 - (sum(1 for flag in valid_flags if flag) / len(valid_flags))
    )

    results_data = dataset_config.log_dataset(df)
    results_data.update(
        {
            "predicted_label": [
                parsed_response.get_prediction()
                if parsed_response is not None
                else None
                for parsed_response in parsed_responses
            ],
            "prompt": prompts,
            "raw_llm_response": raw_responses,
            "parse_error": [parse_errors.get(i, "") for i in range(len(df))],
        }
    )
    results_df = pd.DataFrame(results_data)

    generated_artifact_paths: list[Path] = []
    if experiment_config.artifacts:
        logger.info("Building artifacts: %s", experiment_config.artifacts)
        artifact_builders = get_artifact_builders(
            artifact_names=experiment_config.artifacts,
        )
        # Use a temporary random prefix; final run-name-based filenames are assigned in logger.
        artifact_prefix = uuid4().hex
        for builder in artifact_builders:
            generated_artifact_paths.extend(
                builder.build(
                    predictions=parsed_responses,
                    references=references,
                    output_dir=run_config.output_dir,
                    artifact_prefix=artifact_prefix,
                )
            )

    logger.info("Logging artifacts and metrics to local outputs and MLflow")
    tracking_info = log_experiment_to_mlflow(
        run_config=run_config,
        metrics=all_metrics,
        results_df=results_df,
        additional_artifact_paths=generated_artifact_paths,
    )

    return {
        "num_examples": len(df),
        "backend": "vllm",
        "mlflow_experiment_name": experiment_config.experiment_name,
        "mlflow_run_name": tracking_info.get("effective_run_name"),
        "model_alias": model_config.alias,
        "metrics": all_metrics,
        "tracking": tracking_info,
    }
