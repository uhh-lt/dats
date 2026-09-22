"""Command line interface for llm-file-converter.

All options can be set via CLI arguments or ``LLM_*`` environment variables
(see .env.example). Precedence: CLI argument > environment variable > .env file
> default.
"""

import asyncio
from pathlib import Path
from typing import Annotated

import typer
from dotenv import load_dotenv
from openai import AsyncOpenAI
from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
)

from llm_file_converter.convert import (
    DEFAULT_EXTENSIONS,
    InputDirectoryError,
    PipelineConfig,
    discover_files,
    run_pipeline,
)
from llm_file_converter.filenames import FilenameTemplateError
from llm_file_converter.models import load_metadata_spec
from llm_file_converter.prompts import PromptTemplateError

load_dotenv()

app = typer.Typer(
    name="llm-file-converter",
    help="Convert text-based files to basic HTML, plain text, and metadata using an LLM.",
    no_args_is_help=True,
)

console = Console()
err_console = Console(stderr=True)


@app.command()
def convert(
    input_dir: Annotated[Path, typer.Argument(help="Folder containing the files to convert.")],
    output_dir: Annotated[Path, typer.Argument(help="Folder to write converted files into.")],
    model: Annotated[
        str,
        typer.Option(
            help="Model name as served by the OpenAI-compatible endpoint.",
            envvar="LLM_MODEL",
        ),
    ],
    api_base: Annotated[
        str,
        typer.Option(help="Base URL of the OpenAI-compatible API.", envvar="LLM_API_BASE"),
    ] = "http://localhost:8000/v1",
    api_key: Annotated[
        str,
        typer.Option(help="API key for the endpoint.", envvar="LLM_API_KEY"),
    ] = "EMPTY",
    prompt_template: Annotated[
        str | None,
        typer.Option(
            help="Bundled template name (default, newspaper_ocr, clean_html) or a Jinja2 path.",
            envvar="LLM_PROMPT_TEMPLATE",
        ),
    ] = None,
    metadata_fields: Annotated[
        str | None,
        typer.Option(
            help='Metadata spec as JSON or a file path, e.g. \'{"year": {"type": "int"}}\'.',
            envvar="LLM_METADATA_FIELDS",
        ),
    ] = None,
    filename_template: Annotated[
        str | None,
        typer.Option(
            help="Jinja2 output name template, e.g. '{{ original_stem }}_{{ metadata.year }}'.",
            envvar="LLM_FILENAME_TEMPLATE",
        ),
    ] = None,
    extensions: Annotated[
        str,
        typer.Option(
            help="Comma-separated file extensions to convert (without dots).",
            envvar="LLM_EXTENSIONS",
        ),
    ] = ",".join(DEFAULT_EXTENSIONS),
    recursive: Annotated[
        bool,
        typer.Option(
            "--recursive/--no-recursive",
            help="Recurse into subdirectories.",
            envvar="LLM_RECURSIVE",
        ),
    ] = True,
    concurrency: Annotated[
        int,
        typer.Option(help="Number of files converted concurrently.", envvar="LLM_CONCURRENCY"),
    ] = 4,
    max_retries: Annotated[
        int,
        typer.Option(
            help="Validation retries per file after a malformed LLM response.",
            envvar="LLM_MAX_RETRIES",
        ),
    ] = 2,
    temperature: Annotated[
        float,
        typer.Option(help="Sampling temperature.", envvar="LLM_TEMPERATURE"),
    ] = 0.0,
    max_tokens: Annotated[
        int,
        typer.Option(help="Maximum tokens in the LLM response.", envvar="LLM_MAX_TOKENS"),
    ] = 8192,
    overwrite: Annotated[
        bool,
        typer.Option(
            "--overwrite/--no-overwrite",
            help="Re-convert files whose output already exists.",
        ),
    ] = False,
    dry_run: Annotated[
        bool,
        typer.Option(
            "--dry-run",
            help="List the files that would be converted, without calling the LLM.",
        ),
    ] = False,
) -> None:
    """Convert all supported files in INPUT_DIR and write results to OUTPUT_DIR."""
    try:
        spec = load_metadata_spec(metadata_fields)
    except ValueError as e:
        err_console.print(f"[red]Invalid --metadata-fields:[/red] {e}")
        raise typer.Exit(code=2) from e

    config = PipelineConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        model=model,
        spec=spec,
        prompt_template=prompt_template,
        filename_template=filename_template,
        extensions=tuple(ext.strip() for ext in extensions.split(",") if ext.strip()),
        recursive=recursive,
        concurrency=concurrency,
        max_retries=max_retries,
        temperature=temperature,
        max_tokens=max_tokens,
        overwrite=overwrite,
    )

    try:
        files = discover_files(config)
    except InputDirectoryError as e:
        err_console.print(f"[red]{e}[/red]")
        raise typer.Exit(code=2) from e

    if dry_run:
        console.print(f"[bold]{len(files)} file(s) would be converted:[/bold]")
        for path in files:
            console.print(f"  {path.relative_to(input_dir)}")
        raise typer.Exit()

    client = AsyncOpenAI(base_url=api_base, api_key=api_key)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Converting files", total=len(files))

        def on_file_done(report) -> None:
            progress.advance(task)
            if report.status == "failed":
                err_console.print(f"[red]FAILED[/red] {report.input_file}: {report.error}")

        try:
            report = asyncio.run(run_pipeline(client, config, on_file_done=on_file_done))
        except (PromptTemplateError, FilenameTemplateError) as e:
            err_console.print(f"[red]{e}[/red]")
            raise typer.Exit(code=2) from e

    console.print(
        f"[bold]Done:[/bold] {report.ok} converted, {report.failed} failed, "
        f"{report.skipped} skipped. Report: {output_dir / 'report.jsonl'}"
    )
    if report.failed > 0:
        raise typer.Exit(code=1)
