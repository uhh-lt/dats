import pytest

from llm_file_converter.models import load_metadata_spec
from llm_file_converter.prompts import (
    PromptTemplateError,
    describe_metadata_fields,
    load_template,
    render_prompt,
)

SPEC = load_metadata_spec('{"year": {"type": "integer", "description": "Publication year"}}')


def test_describe_metadata_fields_empty() -> None:
    assert describe_metadata_fields({}) == ""


def test_describe_metadata_fields() -> None:
    text = describe_metadata_fields(SPEC)
    assert "- year (integer): Publication year" in text


def test_load_bundled_templates() -> None:
    for name in ("default", "newspaper_ocr", "clean_html"):
        assert load_template(name) is not None
    assert load_template(None) is not None  # default


def test_load_custom_template(tmp_path) -> None:
    tpl = tmp_path / "custom.j2"
    tpl.write_text("Convert {{ filename }}!\n{{ file_content }}", encoding="utf-8")
    template = load_template(str(tpl))
    assert template is not None


def test_load_template_not_found() -> None:
    with pytest.raises(PromptTemplateError, match="not found"):
        load_template("does-not-exist")


def test_render_prompt_includes_all_variables() -> None:
    template = load_template("default")
    prompt = render_prompt(
        template, file_content="<xml>Hello</xml>", filename="scan.xml", spec=SPEC
    )
    assert "scan.xml" in prompt
    assert "<xml>Hello</xml>" in prompt
    assert "- year (integer): Publication year" in prompt
    assert '"plaintext"' in prompt  # output schema embedded


def test_render_prompt_without_metadata_spec() -> None:
    template = load_template("default")
    prompt = render_prompt(template, file_content="hi", filename="a.txt", spec={})
    assert "metadata fields" not in prompt


def test_render_custom_template(tmp_path) -> None:
    tpl = tmp_path / "custom.j2"
    tpl.write_text("FILE: {{ filename }}\n{{ file_content }}", encoding="utf-8")
    prompt = render_prompt(load_template(str(tpl)), file_content="abc", filename="x.xml", spec={})
    assert prompt == "FILE: x.xml\nabc"
