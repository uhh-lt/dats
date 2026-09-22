"""Prompt template loading and rendering.

Prompt templates are Jinja2 files. Available template variables:

- ``file_content``: the raw text content of the input file.
- ``filename``: the original file name.
- ``metadata_fields``: human-readable description of the metadata spec,
  ready to be embedded in the prompt (empty string when no spec is given).
- ``output_schema``: JSON schema of the expected output (pretty-printed).

Bundled templates live in ``llm_file_converter/templates`` and can be
referenced by name (e.g. ``default``, ``newspaper_ocr``, ``clean_html``).
"""

import json
from pathlib import Path

from jinja2 import ChainableUndefined, Environment, FileSystemLoader, select_autoescape

from llm_file_converter.models import MetadataSpec, output_json_schema

_TEMPLATE_DIR = Path(__file__).parent / "templates"

BUNDLED_TEMPLATES = ("default", "newspaper_ocr", "clean_html")

_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    undefined=ChainableUndefined,
    autoescape=select_autoescape(default=False),
    keep_trailing_newline=True,
)


class PromptTemplateError(Exception):
    """Raised when a prompt template cannot be loaded or rendered."""


def describe_metadata_fields(spec: MetadataSpec) -> str:
    """Render the metadata spec as a human-readable list for the prompt."""
    if not spec:
        return ""
    lines = []
    for name, field in spec.items():
        line = f"- {name} ({field.type})"
        if field.description:
            line += f": {field.description}"
        lines.append(line)
    return "\n".join(lines)


def load_template(template: str | None):
    """Load a prompt template.

    ``template`` may be None (bundled default), a bundled template name,
    or a path to a custom Jinja2 template file.
    """
    if template is None:
        return _env.get_template("default.j2")

    if f"{template}.j2" in BUNDLED_TEMPLATES or template in BUNDLED_TEMPLATES:
        name = template.removesuffix(".j2")
        return _env.get_template(f"{name}.j2")

    path = Path(template)
    if path.is_file():
        env = Environment(
            loader=FileSystemLoader(path.parent),
            undefined=ChainableUndefined,
            autoescape=select_autoescape(default=False),
            keep_trailing_newline=True,
        )
        return env.get_template(path.name)

    msg = f"Prompt template not found: {template!r} (not a bundled name or existing file)"
    raise PromptTemplateError(msg)


def render_prompt(
    template,
    *,
    file_content: str,
    filename: str,
    spec: MetadataSpec,
) -> str:
    """Render a prompt template for one input file."""
    return template.render(
        file_content=file_content,
        filename=filename,
        metadata_fields=describe_metadata_fields(spec),
        output_schema=json.dumps(output_json_schema(spec), indent=2),
    )
