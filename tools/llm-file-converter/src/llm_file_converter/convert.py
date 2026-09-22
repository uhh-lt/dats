"""Conversion pipeline: file discovery, per-file conversion, and output writing."""

import asyncio
import json
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from openai import AsyncOpenAI

from llm_file_converter.filenames import render_output_stem, resolve_collision
from llm_file_converter.llm import ConversionError, convert_content
from llm_file_converter.models import MetadataSpec
from llm_file_converter.prompts import load_template, render_prompt

DEFAULT_EXTENSIONS = ("xml", "txt", "html", "htm", "md", "csv", "json")


@dataclass
class PipelineConfig:
    """Everything the pipeline needs that is not per-file state."""

    input_dir: Path
    output_dir: Path
    model: str
    spec: MetadataSpec
    prompt_template: str | None = None
    filename_template: str | None = None
    extensions: tuple[str, ...] = DEFAULT_EXTENSIONS
    recursive: bool = True
    concurrency: int = 4
    max_retries: int = 2
    temperature: float = 0.0
    max_tokens: int = 8192
    overwrite: bool = False


@dataclass
class FileReport:
    """Per-file outcome, serialized into report.jsonl."""

    input_file: str
    status: Literal["ok", "failed", "skipped"]
    output_stem: str | None = None
    error: str | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0


@dataclass
class RunReport:
    """Aggregated result of a full conversion run."""

    reports: list[FileReport] = field(default_factory=list)

    @property
    def ok(self) -> int:
        return sum(1 for r in self.reports if r.status == "ok")

    @property
    def failed(self) -> int:
        return sum(1 for r in self.reports if r.status == "failed")

    @property
    def skipped(self) -> int:
        return sum(1 for r in self.reports if r.status == "skipped")


class InputDirectoryError(Exception):
    """Raised when the input directory is missing, not a directory, or empty."""


def discover_files(config: PipelineConfig) -> list[Path]:
    """Validate the input directory and collect matching files (sorted)."""
    input_dir = config.input_dir
    if not input_dir.exists():
        msg = f"Input directory does not exist: {input_dir}"
        raise InputDirectoryError(msg)
    if not input_dir.is_dir():
        msg = f"Input path is not a directory: {input_dir}"
        raise InputDirectoryError(msg)

    extensions = {ext.lower().lstrip(".") for ext in config.extensions}
    candidates = input_dir.rglob("*") if config.recursive else input_dir.glob("*")
    files = sorted(
        p for p in candidates if p.is_file() and p.suffix.lower().lstrip(".") in extensions
    )

    if not files:
        msg = f"Input directory contains no files with extensions {sorted(extensions)}: {input_dir}"
        raise InputDirectoryError(msg)
    return files


def _write_sidecars(
    output_dir: Path,
    stem: str,
    result: Any,
    *,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    used_names: set[str],
) -> None:
    """Write .html / .txt / .meta.json sidecar files for one converted file."""
    if result.html is not None:
        output_dir.joinpath(resolve_collision(stem, ".html", used_names)).write_text(
            result.html, encoding="utf-8"
        )
    output_dir.joinpath(resolve_collision(stem, ".txt", used_names)).write_text(
        result.plaintext, encoding="utf-8"
    )
    meta = {
        "metadata": result.metadata.model_dump() if result.metadata is not None else None,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
    }
    output_dir.joinpath(resolve_collision(stem, ".meta.json", used_names)).write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )


async def _convert_one(
    client: AsyncOpenAI,
    config: PipelineConfig,
    template: Any,
    path: Path,
    index: int,
    used_names: set[str],
    semaphore: asyncio.Semaphore,
) -> FileReport:
    rel = str(path.relative_to(config.input_dir))

    stem = render_output_stem(
        config.filename_template,
        original_path=path,
        metadata=None,
        index=index,
    )
    if not config.overwrite and (config.output_dir / f"{stem}.txt").exists():
        return FileReport(input_file=rel, status="skipped", output_stem=stem)

    async with semaphore:
        try:
            content = await asyncio.to_thread(path.read_text, encoding="utf-8", errors="replace")
            prompt = render_prompt(
                template, file_content=content, filename=path.name, spec=config.spec
            )
            success = await convert_content(
                client,
                model=config.model,
                prompt=prompt,
                spec=config.spec,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                max_retries=config.max_retries,
            )
        except ConversionError as e:
            return FileReport(input_file=rel, status="failed", error=str(e))
        except OSError as e:
            return FileReport(input_file=rel, status="failed", error=f"Could not read file: {e}")

    metadata = success.result.metadata.model_dump() if success.result.metadata is not None else None
    stem = render_output_stem(
        config.filename_template,
        original_path=path,
        metadata=metadata,
        index=index,
    )
    _write_sidecars(
        config.output_dir,
        stem,
        success.result,
        model=config.model,
        prompt_tokens=success.prompt_tokens,
        completion_tokens=success.completion_tokens,
        used_names=used_names,
    )
    return FileReport(
        input_file=rel,
        status="ok",
        output_stem=stem,
        prompt_tokens=success.prompt_tokens,
        completion_tokens=success.completion_tokens,
    )


async def run_pipeline(
    client: AsyncOpenAI,
    config: PipelineConfig,
    *,
    on_file_done: Callable[[FileReport], None] | None = None,
) -> RunReport:
    """Convert all matching files in the input directory.

    Creates the output directory if necessary. Individual file failures never
    abort the run; they are recorded in the returned report.
    """
    files = discover_files(config)
    config.output_dir.mkdir(parents=True, exist_ok=True)

    template = load_template(config.prompt_template)
    semaphore = asyncio.Semaphore(config.concurrency)
    used_names: set[str] = set()

    tasks = [
        _convert_one(client, config, template, path, index, used_names, semaphore)
        for index, path in enumerate(files)
    ]
    reports: list[FileReport] = []
    for coro in asyncio.as_completed(tasks):
        report = await coro
        reports.append(report)
        if on_file_done is not None:
            on_file_done(report)

    run_report = RunReport(reports=reports)
    report_path = config.output_dir / "report.jsonl"
    with report_path.open("w", encoding="utf-8") as f:
        for report in sorted(reports, key=lambda r: r.input_file):
            f.write(json.dumps(report.__dict__, ensure_ascii=False) + "\n")
    return run_report
