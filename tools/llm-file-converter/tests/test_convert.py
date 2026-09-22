import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from llm_file_converter.convert import (
    InputDirectoryError,
    PipelineConfig,
    discover_files,
    run_pipeline,
)
from llm_file_converter.models import load_metadata_spec

SPEC = load_metadata_spec('{"year": {"type": "integer"}}')

VALID_PAYLOAD = {
    "plaintext": "Hello world",
    "html": "<p>Hello world</p>",
    "metadata": {"year": 1923},
}


def make_response(payload: Any):
    content = payload if isinstance(payload, str) else json.dumps(payload)
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(prompt_tokens=10, completion_tokens=5),
    )


class FakeCompletions:
    def __init__(self, payloads: list):
        self._payloads = payloads

    async def create(self, **kwargs):
        # cycle through payloads; enough for all files + retries
        payload = self._payloads.pop(0)
        self._payloads.append(payload)
        return make_response(payload)


class FakeClient:
    def __init__(self, payloads: list):
        self.chat = SimpleNamespace(completions=FakeCompletions(payloads))


def make_config(input_dir: Path, output_dir: Path, **overrides) -> PipelineConfig:
    return PipelineConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        model="test-model",
        spec=SPEC,
        **overrides,
    )


@pytest.fixture
def input_dir(tmp_path: Path) -> Path:
    d = tmp_path / "input"
    d.mkdir()
    (d / "a.xml").write_text("<xml>alpha</xml>", encoding="utf-8")
    (d / "b.xml").write_text("<xml>beta</xml>", encoding="utf-8")
    (d / "ignored.pdf").write_bytes(b"%PDF")
    sub = d / "sub"
    sub.mkdir()
    (sub / "c.xml").write_text("<xml>gamma</xml>", encoding="utf-8")
    return d


def test_discover_files_recursive(input_dir: Path, tmp_path: Path) -> None:
    files = discover_files(make_config(input_dir, tmp_path / "out"))
    assert [f.name for f in files] == ["a.xml", "b.xml", "c.xml"]


def test_discover_files_non_recursive(input_dir: Path, tmp_path: Path) -> None:
    files = discover_files(make_config(input_dir, tmp_path / "out", recursive=False))
    assert [f.name for f in files] == ["a.xml", "b.xml"]


def test_discover_files_extension_filter(input_dir: Path, tmp_path: Path) -> None:
    files = discover_files(make_config(input_dir, tmp_path / "out", extensions=("pdf",)))
    assert [f.name for f in files] == ["ignored.pdf"]


def test_discover_files_missing_dir(tmp_path: Path) -> None:
    with pytest.raises(InputDirectoryError, match="does not exist"):
        discover_files(make_config(tmp_path / "nope", tmp_path / "out"))


def test_discover_files_not_a_dir(input_dir: Path, tmp_path: Path) -> None:
    with pytest.raises(InputDirectoryError, match="not a directory"):
        discover_files(make_config(input_dir / "a.xml", tmp_path / "out"))


def test_discover_files_empty_dir(tmp_path: Path) -> None:
    empty = tmp_path / "empty"
    empty.mkdir()
    with pytest.raises(InputDirectoryError, match="no files"):
        discover_files(make_config(empty, tmp_path / "out"))


async def test_pipeline_writes_sidecars(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    report = await run_pipeline(FakeClient([VALID_PAYLOAD]), make_config(input_dir, out))

    assert report.ok == 3
    assert report.failed == 0
    for stem in ("a", "b", "c"):
        assert (out / f"{stem}.txt").read_text(encoding="utf-8") == "Hello world"
        assert (out / f"{stem}.html").read_text(encoding="utf-8") == "<p>Hello world</p>"
        meta = json.loads((out / f"{stem}.meta.json").read_text(encoding="utf-8"))
        assert meta["metadata"] == {"year": 1923}
        assert meta["model"] == "test-model"

    lines = (out / "report.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 3
    assert all(json.loads(line)["status"] == "ok" for line in lines)


async def test_pipeline_filename_template_with_metadata(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    config = make_config(
        input_dir, out, filename_template="{{ original_stem }}_year-{{ metadata.year }}"
    )
    await run_pipeline(FakeClient([VALID_PAYLOAD]), config)
    assert (out / "a_year-1923.txt").exists()


async def test_pipeline_filename_template_missing_metadata_falls_back(
    input_dir: Path, tmp_path: Path
) -> None:
    out = tmp_path / "out"
    payload = {"plaintext": "text only", "html": None, "metadata": None}
    config = make_config(
        input_dir, out, filename_template="{{ metadata.year }}-{{ metadata.month }}"
    )
    report = await run_pipeline(FakeClient([payload]), config)
    assert report.ok == 3
    assert (out / "a.txt").exists()  # original stem fallback


async def test_pipeline_failed_file_does_not_abort_run(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    # first payload is invalid JSON, second is valid; FakeCompletions cycles them,
    # so each file gets one bad response then a good one on retry — force failure
    # by allowing zero retries and using only bad payloads for one file instead.
    config = make_config(input_dir, out, max_retries=0)
    client = FakeClient(["totally broken", VALID_PAYLOAD, VALID_PAYLOAD])
    report = await run_pipeline(client, config)
    assert report.ok == 2
    assert report.failed == 1
    failed = next(r for r in report.reports if r.status == "failed")
    assert failed.error is not None


async def test_pipeline_skips_existing_without_overwrite(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    out.mkdir()
    (out / "a.txt").write_text("already here", encoding="utf-8")
    report = await run_pipeline(FakeClient([VALID_PAYLOAD]), make_config(input_dir, out))
    assert report.skipped == 1
    assert report.ok == 2
    assert (out / "a.txt").read_text(encoding="utf-8") == "already here"


async def test_pipeline_overwrite_replaces_existing(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    out.mkdir()
    (out / "a.txt").write_text("already here", encoding="utf-8")
    report = await run_pipeline(
        FakeClient([VALID_PAYLOAD]), make_config(input_dir, out, overwrite=True)
    )
    assert report.skipped == 0
    assert (out / "a.txt").read_text(encoding="utf-8") == "Hello world"


async def test_pipeline_creates_output_dir(input_dir: Path, tmp_path: Path) -> None:
    out = tmp_path / "deeply" / "nested" / "out"
    await run_pipeline(FakeClient([VALID_PAYLOAD]), make_config(input_dir, out))
    assert out.is_dir()
