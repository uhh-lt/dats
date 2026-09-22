"""Dynamic pydantic models for the LLM conversion result.

The LLM is asked to return a JSON object with three keys:

- ``plaintext`` (required): the extracted plain text.
- ``html`` (optional): the content converted to basic HTML.
- ``metadata`` (optional): an object whose fields are described by the user via a
  metadata field spec (JSON). Every metadata field is optional, so the LLM can
  never crash the conversion by omitting a value it could not extract.
"""

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, create_model

# Allowed metadata field types in the user-provided spec.
FieldType = Literal["string", "integer", "number", "boolean"]

_TYPE_MAP: dict[str, type] = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
}


class MetadataFieldSpec(BaseModel):
    """Specification of a single metadata field to extract."""

    type: FieldType = "string"
    description: str = ""


# name -> spec, e.g. {"year": {"type": "integer", "description": "Publication year"}}
MetadataSpec = dict[str, MetadataFieldSpec]


def load_metadata_spec(raw: str | None) -> MetadataSpec:
    """Parse a metadata field spec from a JSON string or a path to a JSON file.

    Returns an empty spec when ``raw`` is None. Raises ``ValueError`` on invalid input.
    """
    if raw is None:
        return {}

    text = raw
    path = Path(raw)
    if not raw.lstrip().startswith("{") and path.is_file():
        text = path.read_text(encoding="utf-8")

    try:
        data: Any = json.loads(text)
    except json.JSONDecodeError as e:
        msg = f"Metadata field spec is neither valid JSON nor a path to a JSON file: {e}"
        raise ValueError(msg) from e

    if not isinstance(data, dict):
        msg = "Metadata field spec must be a JSON object mapping field names to specs."
        raise ValueError(msg)

    try:
        return {name: MetadataFieldSpec.model_validate(spec) for name, spec in data.items()}
    except Exception as e:
        msg = f"Invalid metadata field spec: {e}"
        raise ValueError(msg) from e


def build_metadata_model(spec: MetadataSpec) -> type[BaseModel]:
    """Build a pydantic model for the metadata object from a field spec.

    All fields are optional and default to None. Extra keys returned by the LLM
    are ignored rather than rejected.
    """
    fields: dict[str, Any] = {}
    for name, field_spec in spec.items():
        py_type = _TYPE_MAP[field_spec.type]
        fields[name] = (
            py_type | None,
            Field(default=None, description=field_spec.description or None),
        )

    return create_model(
        "ConversionMetadata",
        __config__=ConfigDict(extra="ignore"),
        **fields,
    )


def build_output_model(spec: MetadataSpec) -> type[BaseModel]:
    """Build the full structured-output model for the LLM conversion result."""
    metadata_model = build_metadata_model(spec)

    return create_model(
        "ConversionResult",
        __config__=ConfigDict(extra="ignore"),
        plaintext=(str, Field(description="The extracted plain text of the document.")),
        html=(
            str | None,
            Field(
                default=None,
                description="The document content converted to basic HTML.",
            ),
        ),
        metadata=(
            metadata_model | None,
            Field(
                default=None,
                description="Extracted metadata; omit fields you cannot determine.",
            ),
        ),
    )


def output_json_schema(spec: MetadataSpec) -> dict[str, Any]:
    """Return the JSON schema used for the OpenAI structured-output request."""
    return build_output_model(spec).model_json_schema()
