import asyncio
import logging
from importlib import import_module
from pathlib import Path
from typing import Any

import pandas as pd
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel, ValidationError

from core.docker_manager import managed_vllm_container
from core.llm_client import run_batch_inference
from core.logger import log_experiment_to_mlflow
from evaluation.metrics_utils import extract_labels
from evaluation.registry import get_metric_evaluators
from schemas.config_schema import RunConfig

logger = logging.getLogger(__name__)


def _load_schema(schema_ref: str) -> type[BaseModel]:
    schema_module_name, schema_class_name = schema_ref.rsplit(".", 1)
    import_name = (
        schema_module_name
        if schema_module_name.startswith("schemas.")
        else f"schemas.{schema_module_name}"
    )
    module = import_module(import_name)
    schema_class = getattr(module, schema_class_name)
    return schema_class


def _render_prompts(
    df: pd.DataFrame,
    template_dir: Path,
    template_name: str,
    text_column: str,
    prompt_variables: dict[str, Any],
) -> list[str]:
    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=False)
    template = env.get_template(template_name)

    prompts: list[str] = []
    for _, row in df.iterrows():
        row_context: dict[str, Any] = {
            str(key): value.item() if hasattr(value, "item") else value
            for key, value in row.to_dict().items()
        }
        row_context.update(prompt_variables)
        # Canonical template variable for the source text comes from dataset.text_column.
        row_context["text"] = row_context[text_column]
        prompts.append(template.render(**row_context))

    return prompts


def _parse_responses(
    raw_responses: list[str],
    schema_class: type[BaseModel],
) -> tuple[list[BaseModel | None], list[bool], dict[int, str]]:
    parsed_objects: list[BaseModel | None] = []
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
        df = df.head(experiment_config.max_examples).copy()
        logger.info(
            "Applying max_examples=%d -> %d rows",
            experiment_config.max_examples,
            len(df),
        )

    true_labels = df[dataset_config.label_column].astype(str).tolist()

    logger.info(
        "Rendering prompts using template %s", experiment_config.prompt_template
    )
    prompts = _render_prompts(
        df=df,
        template_dir=experiment_config.prompt_template.parent,
        template_name=experiment_config.prompt_template.name,
        text_column=dataset_config.text_column,
        prompt_variables=experiment_config.prompt_variables,
    )

    print("Example rendered prompts:")
    for i, prompt in enumerate(prompts[:3], start=1):
        print(f"Prompt {i}:\n{prompt}\n{'-' * 40}")

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
                schema=schema_class,
                model_alias=model_config.alias,
                base_url=base_url,
                api_key=backend_config.api_key,
                concurrency=backend_config.concurrency,
                temperature=experiment_config.temperature,
            )
        )

    parsed_objects, valid_flags, parse_errors = _parse_responses(
        raw_responses, schema_class
    )

    if parse_errors and run_config.fail_on_parse_error:
        raise RuntimeError(
            f"Schema validation failed for {len(parse_errors)} response(s)."
        )

    logger.info("Computing metrics: %s", experiment_config.metrics)
    evaluators = get_metric_evaluators(
        metric_names=experiment_config.metrics,
        label_field=experiment_config.prediction_label_field,
    )

    all_metrics: dict[str, float] = {}
    for evaluator in evaluators:
        all_metrics.update(
            evaluator.compute(predictions=parsed_objects, references=true_labels)
        )
    all_metrics["parse_error_rate"] = (
        0.0
        if not valid_flags
        else 1.0 - (sum(1 for flag in valid_flags if flag) / len(valid_flags))
    )

    predicted_labels = extract_labels(
        parsed_objects, experiment_config.prediction_label_field
    )
    results_df = df.copy()
    results_df["prompt"] = prompts
    results_df["raw_llm_response"] = raw_responses
    results_df["predicted_label"] = predicted_labels
    results_df["schema_valid"] = valid_flags
    results_df["parse_error"] = [
        parse_errors.get(i, "") for i in range(len(results_df))
    ]

    logger.info("Logging artifacts and metrics to local outputs and MLflow")
    tracking_info = log_experiment_to_mlflow(
        run_config=run_config,
        metrics=all_metrics,
        results_df=results_df,
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
