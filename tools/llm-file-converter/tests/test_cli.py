import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from typer.testing import CliRunner

from llm_file_converter.cli import app

runner = CliRunner()

VALID_PAYLOAD = {
    "plaintext": "Hello world",
    "html": "<p>Hello world</p>",
    "metadata": None,
}


def make_response(payload: Any):
    content = payload if isinstance(payload, str) else json.dumps(payload)
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(prompt_tokens=10, completion_tokens=5),
    )


class FakeCompletions:
    async def create(self, **kwargs):
        return make_response(VALID_PAYLOAD)


class FakeClient:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.chat = SimpleNamespace(completions=FakeCompletions())


@pytest.fixture
def input_dir(tmp_path: Path) -> Path:
    d = tmp_path / "input"
    d.mkdir()
    (d / "a.xml").write_text("<xml>alpha</xml>", encoding="utf-8")
    (d / "b.txt").write_text("beta", encoding="utf-8")
    return d


@pytest.fixture(autouse=True)
def fake_openai_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("llm_file_converter.cli.AsyncOpenAI", FakeClient)


def test_help_lists_all_options() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    for option in (
        "--model",
        "--api-base",
        "--api-key",
        "--prompt-template",
        "--metadata-fields",
        "--filename-template",
        "--extensions",
        "--recursive",
        "--concurrency",
        "--max-retries",
        "--temperature",
        "--max-tokens",
        "--overwrite",
        "--dry-run",
    ):
        assert option in result.output


def test_model_is_required(
    input_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("LLM_MODEL", raising=False)
    result = runner.invoke(app, [str(input_dir), str(tmp_path / "out")])
    assert result.exit_code == 2
    assert "Missing option" in result.output


def test_model_from_env_var(
    input_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LLM_MODEL", "env-model")
    result = runner.invoke(app, [str(input_dir), str(tmp_path / "out")])
    assert result.exit_code == 0, result.output


def test_dry_run_lists_files_without_converting(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    result = runner.invoke(app, [str(input_dir), str(out), "--model", "m", "--dry-run"])
    assert result.exit_code == 0
    assert "a.xml" in result.output
    assert "b.txt" in result.output
    assert not out.exists()


def test_convert_writes_outputs(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    result = runner.invoke(app, [str(input_dir), str(out), "--model", "m"])
    assert result.exit_code == 0, result.output
    assert (out / "a.txt").exists()
    assert (out / "b.txt").exists()
    assert (out / "report.jsonl").exists()


def test_missing_input_dir_fails(tmp_path: Path) -> None:
    result = runner.invoke(app, [str(tmp_path / "nope"), str(tmp_path / "out"), "--model", "m"])
    assert result.exit_code == 2
    assert "does not exist" in result.output


def test_invalid_metadata_fields_fails(input_dir: Path, tmp_path: Path) -> None:
    result = runner.invoke(
        app,
        [
            str(input_dir),
            str(tmp_path / "out"),
            "--model",
            "m",
            "--metadata-fields",
            "{bad",
        ],
    )
    assert result.exit_code == 2
    assert "metadata-fields" in result.output


def test_metadata_fields_from_file(input_dir: Path, tmp_path: Path) -> None:
    spec_file = tmp_path / "spec.json"
    spec_file.write_text('{"year": {"type": "integer"}}', encoding="utf-8")
    result = runner.invoke(
        app,
        [
            str(input_dir),
            str(tmp_path / "out"),
            "--model",
            "m",
            "--metadata-fields",
            str(spec_file),
        ],
    )
    assert result.exit_code == 0, result.output
