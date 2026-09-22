# Plan: llm-file-converter — LLM-based file-to-HTML conversion CLI

## TL;DR

Standalone uv-managed Python CLI at `tools/llm-file-converter/` that converts text-based files (e.g. OCR'd XML scans) to basic HTML + plain text + metadata via an OpenAI-compatible LLM (vLLM). One LLM call per file using `openai` structured outputs (`response_format=json_schema`, vLLM guided decoding) with a small manual validation-retry loop — no agent framework. Prompts and output filenames use Jinja2 templates; metadata fields are user-described via CLI/JSON and injected into a dynamically built pydantic model. Config via CLI args or env vars (`.env.example` provided).

**Confirmed decisions:** openai + structured outputs (not pydantic-ai); sidecar output files per input; Jinja2 for both prompt and filename templates.

## Tech stack / dependencies

- Python `>=3.11`, uv project (`uv init --package`, `pyproject.toml` with `[project.scripts] llm-file-converter = "llm_file_converter.cli:app"`)
- `typer` — CLI with `--help`, env var support (`envvar=` per option)
- `openai` (>=1.x, `AsyncOpenAI`) — chat completions with `response_format={"type": "json_schema", ...}` (vLLM guided decoding)
- `pydantic` v2 — dynamic output model (`create_model`), settings validation
- `jinja2` (`ChainableUndefined`) — prompt templates + filename template
- `python-dotenv` — auto-load `.env` from CWD
- `rich` — progress bar, error summary
- Dev: `pytest`, `pytest-asyncio`, `ruff`

## Project layout

```
tools/llm-file-converter/
├── pyproject.toml
├── README.md
├── .env.example
├── src/llm_file_converter/
│   ├── __init__.py
│   ├── cli.py            # typer app, env var resolution, orchestration
│   ├── config.py         # ConversionConfig dataclass/pydantic settings
│   ├── models.py         # dynamic pydantic model builder (metadata fields)
│   ├── llm.py            # AsyncOpenAI client, structured-output call, retry loop
│   ├── prompts.py        # Jinja2 loading/rendering, metadata-spec injection
│   ├── convert.py        # per-file pipeline: read → render → call → parse → write
│   ├── filenames.py      # filename template rendering, sanitization, collision handling
│   └── templates/        # bundled prompt templates (packaged data)
│       ├── default.j2
│       ├── newspaper_ocr.j2
│       └── clean_html.j2
└── tests/
    ├── test_models.py
    ├── test_prompts.py
    ├── test_filenames.py
    ├── test_convert.py   # mocked LLM
    └── test_cli.py       # typer CliRunner
```

## CLI design

`llm-file-converter convert INPUT_DIR OUTPUT_DIR [options]`

| Option                         | Env var                 | Default                                 |
| ------------------------------ | ----------------------- | --------------------------------------- |
| `--model`                      | `LLM_MODEL`             | (required)                              |
| `--api-base`                   | `LLM_API_BASE`          | `http://localhost:8000/v1`              |
| `--api-key`                    | `LLM_API_KEY`           | `EMPTY`                                 |
| `--prompt-template PATH`       | `LLM_PROMPT_TEMPLATE`   | bundled `default.j2`                    |
| `--metadata-fields SPEC`       | `LLM_METADATA_FIELDS`   | none (JSON string or path to JSON file) |
| `--filename-template TPL`      | `LLM_FILENAME_TEMPLATE` | `{original filename}`                   |
| `--extensions LIST`            | `LLM_EXTENSIONS`        | `xml,txt,html,htm,md,csv,json`          |
| `--recursive / --no-recursive` | `LLM_RECURSIVE`         | recursive                               |
| `--concurrency N`              | `LLM_CONCURRENCY`       | `4`                                     |
| `--max-retries N`              | `LLM_MAX_RETRIES`       | `2`                                     |
| `--temperature F`              | `LLM_TEMPERATURE`       | `0.0`                                   |
| `--max-tokens N`               | `LLM_MAX_TOKENS`        | `8192`                                  |
| `--overwrite / --no-overwrite` | —                       | skip existing outputs                   |
| `--dry-run`                    | —                       | list files, no LLM calls                |

Precedence: CLI arg > env var > `.env` file > default. `.env.example` lists all `LLM_*` vars with comments.

## Core design details

### Dynamic output model (models.py)

- Metadata field spec: JSON like `{"year": {"type": "integer", "description": "Publication year"}, "month": ..., "author": ...}`; allowed types: string/integer/number/boolean.
- `build_output_model(spec)` → `create_model("ConversionResult", plaintext=(str, ...), html=(str | None, None), metadata=(DynamicMetadata, None))` where DynamicMetadata has every field `Optional[...] = None`. LLM can never crash the run by omitting metadata.
- JSON schema for `response_format` comes from `model.model_json_schema()`; parsed result validated with `model.model_validate(...)`.

### LLM call (llm.py)

- `AsyncOpenAI(base_url=..., api_key=...)`, `client.chat.completions.create(model=..., messages=[system, user], response_format={"type": "json_schema", "json_schema": {"name": "conversion_result", "schema": ...}}, temperature=..., max_tokens=...)`.
- Retry loop: on `ValidationError`/bad JSON, append the error to the conversation and retry up to `--max-retries`; then mark file as failed (never crash the batch).
- `asyncio.Semaphore(concurrency)`; files processed via `asyncio.gather` + rich progress.

### Prompt templates (prompts.py)

- Jinja2 with `ChainableUndefined`. Variables: `file_content`, `filename`, `metadata_fields` (rendered spec), `output_schema` (optional).
- Bundled templates: `default.j2` (generic text→HTML), `newspaper_ocr.j2` (OCR scan cleanup, error correction, article structure), `clean_html.j2` (minimal semantic HTML emphasis). `--prompt-template` overrides with a user file.

### Filename construction (filenames.py)

- Jinja2 template, context: `original_filename`, `original_stem`, `original_suffix`, `metadata` (dict), `index`.
- Missing metadata → empty string via ChainableUndefined; collapse repeated separators/whitespace; if result is empty or all metadata missing → fall back to original filename.
- Sanitize path-unsafe chars; on collision append `-2`, `-3`, …; extension always `.html`/`.txt`/`.meta.json` regardless of template.

### Output layout (sidecar files)

Per input file `scan001.xml` → `OUTPUT_DIR/scan001.html`, `OUTPUT_DIR/scan001.txt`, `OUTPUT_DIR/scan001.meta.json` (metadata + model + token usage). Plus one `report.jsonl` at the end: per-file status (ok/failed/skipped), error message, tokens. Failed files recorded, batch continues.

### Pipeline (convert.py)

1. Validate input dir exists and contains matching files (error exit otherwise); create output dir.
2. Collect files by extension (recursive optional), skip already-converted unless `--overwrite`.
3. Read text (utf-8, `errors="replace"`); render prompt; call LLM; validate; render filename; write sidecars.
4. Write `report.jsonl`; exit code 0 if all ok, 1 if any failures.

## Implementation steps

**Phase 1 — Scaffold**

1. `uv init --package tools/llm-file-converter`; add deps; configure ruff + `[project.scripts]`; verify `uv run llm-file-converter --help` shows the (empty) typer app.
2. `.env.example` + README skeleton documenting env vars and usage.

**Phase 2 — Core modules** _(3–5 parallelizable)_ 3. `models.py`: metadata-spec parsing + `build_output_model` + unit tests. 4. `prompts.py`: Jinja2 env, bundled templates, metadata-spec injection + tests. 5. `filenames.py`: filename template rendering, sanitization, fallback, collisions + tests.

**Phase 3 — LLM + pipeline** _(depends on 3–5)_ 6. `llm.py`: async client wrapper, structured-output request, validation-retry loop + tests with mocked client. 7. `convert.py`: file discovery, per-file pipeline, sidecar writers, `report.jsonl` + tests with mocked LLM.

**Phase 4 — CLI + polish** _(depends on 6–7)_ 8. `cli.py`: typer app wiring all options/env vars, `--dry-run`, exit codes + CliRunner tests. 9. README: full usage, template authoring guide, metadata spec format, examples against local vLLM.

**Phase 5 — Verification** 10. `uv run pytest` green; `uv run ruff check` clean; manual smoke test against a real vLLM endpoint with a sample XML scan.

## Verification

1. `cd tools/llm-file-converter && uv sync && uv run pytest` — all unit tests pass.
2. `uv run llm-file-converter --help` and `... convert --help` render full option docs.
3. Env-only config: `cp .env.example .env`, fill values, run with no CLI args — resolves correctly.
4. `--dry-run` lists discovered files without calling the LLM.
5. Live smoke test: convert 2–3 sample XML OCR files against local vLLM; inspect `.html`/`.txt`/`.meta.json` and `report.jsonl`; confirm a file with unextractable metadata still succeeds with `metadata: null` and falls back to the original filename.

## Decisions

- Single LLM invocation per file; no agent framework (no tools/multi-step needed). Retries handled by a small manual loop.
- openai + pydantic chosen over pydantic-ai/instructor for minimal deps and direct vLLM guided-decoding control.
- Jinja2 for both prompt and filename templates (one engine, ChainableUndefined handles missing metadata).
- All metadata optional; LLM never constructs filenames — code does, from extracted metadata.
- Scope excluded: binary/PDF input, chunking of oversized files (v1 errors clearly on context overflow), streaming, resumable state beyond `--overwrite` skipping.

## Further considerations

1. Very large files may exceed context — v1 fails the file with a clear error; chunking/stitching is a possible v2 feature.
2. If vLLM guided decoding proves unreliable for a model, fallback: prompt-only JSON + `model_validate` retry loop (already built).
