import pytest

from llm_file_converter.models import (
    build_metadata_model,
    build_output_model,
    load_metadata_spec,
    output_json_schema,
)

SPEC_JSON = '{"year": {"type": "integer", "description": "Publication year"}, "author": {}}'


def test_load_spec_from_json_string() -> None:
    spec = load_metadata_spec(SPEC_JSON)
    assert set(spec) == {"year", "author"}
    assert spec["year"].type == "integer"
    assert spec["year"].description == "Publication year"
    assert spec["author"].type == "string"  # default type


def test_load_spec_from_file(tmp_path) -> None:
    spec_file = tmp_path / "spec.json"
    spec_file.write_text(SPEC_JSON, encoding="utf-8")
    spec = load_metadata_spec(str(spec_file))
    assert set(spec) == {"year", "author"}


def test_load_spec_none_is_empty() -> None:
    assert load_metadata_spec(None) == {}


def test_load_spec_invalid_json() -> None:
    with pytest.raises(ValueError, match="neither valid JSON"):
        load_metadata_spec("{not json")


def test_load_spec_not_an_object() -> None:
    with pytest.raises(ValueError, match="must be a JSON object"):
        load_metadata_spec('["year"]')


def test_load_spec_invalid_type() -> None:
    with pytest.raises(ValueError, match="Invalid metadata field spec"):
        load_metadata_spec('{"year": {"type": "date"}}')


def test_metadata_model_all_optional() -> None:
    model = build_metadata_model(load_metadata_spec(SPEC_JSON))
    instance = model.model_validate({})
    assert instance.year is None
    assert instance.author is None


def test_metadata_model_types_and_extra_ignored() -> None:
    model = build_metadata_model(load_metadata_spec(SPEC_JSON))
    instance = model.model_validate({"year": 1923, "unknown": "ignored"})
    assert instance.year == 1923
    assert instance.author is None
    assert not hasattr(instance, "unknown")


def test_output_model_requires_plaintext_only() -> None:
    model = build_output_model(load_metadata_spec(SPEC_JSON))
    result = model.model_validate({"plaintext": "Hello world"})
    assert result.plaintext == "Hello world"
    assert result.html is None
    assert result.metadata is None


def test_output_model_full() -> None:
    model = build_output_model(load_metadata_spec(SPEC_JSON))
    result = model.model_validate(
        {
            "plaintext": "Hello world",
            "html": "<p>Hello world</p>",
            "metadata": {"year": 1923},
        }
    )
    assert result.metadata.year == 1923
    assert result.metadata.author is None


def test_output_model_missing_plaintext_fails() -> None:
    model = build_output_model(load_metadata_spec(SPEC_JSON))
    with pytest.raises(Exception, match="plaintext"):
        model.model_validate({"html": "<p>x</p>"})


def test_output_json_schema_structure() -> None:
    schema = output_json_schema(load_metadata_spec(SPEC_JSON))
    assert "plaintext" in schema["properties"]
    assert "plaintext" in schema["required"]
    assert "html" not in schema["required"]
    assert "metadata" not in schema["required"]
