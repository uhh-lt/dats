from pathlib import Path

import pytest

from llm_file_converter.filenames import (
    FilenameTemplateError,
    render_output_stem,
    resolve_collision,
    sanitize_filename,
)

SCAN = Path("scan001.xml")


def test_no_template_uses_original_stem() -> None:
    assert render_output_stem(None, original_path=SCAN, metadata=None, index=0) == "scan001"


def test_template_with_metadata() -> None:
    stem = render_output_stem(
        "{{ original_stem }}_year-{{ metadata.year }}_month-{{ metadata.month }}",
        original_path=SCAN,
        metadata={"year": 1923, "month": 5},
        index=0,
    )
    assert stem == "scan001_year-1923_month-5"


def test_template_missing_metadata_renders_empty() -> None:
    stem = render_output_stem(
        "{{ original_stem }}_year-{{ metadata.year }}",
        original_path=SCAN,
        metadata={},
        index=0,
    )
    assert stem == "scan001_year"


def test_template_all_missing_falls_back_to_original() -> None:
    stem = render_output_stem(
        "{{ metadata.year }}-{{ metadata.month }}",
        original_path=SCAN,
        metadata=None,
        index=0,
    )
    assert stem == "scan001"


def test_template_empty_result_falls_back() -> None:
    stem = render_output_stem("   ", original_path=SCAN, metadata=None, index=0)
    assert stem == "scan001"


def test_template_error_raises() -> None:
    with pytest.raises(FilenameTemplateError):
        render_output_stem("{{ metadata[", original_path=SCAN, metadata=None, index=0)


def test_sanitize_removes_unsafe_chars() -> None:
    assert sanitize_filename('a<b>:"c/\\d|?*e') == "abcde"


def test_sanitize_collapses_separators() -> None:
    assert sanitize_filename("a--b__c  d") == "a-b_c d"


def test_sanitize_strips_edges() -> None:
    assert sanitize_filename("  -name-  ") == "name"


def test_resolve_collision() -> None:
    used: set[str] = set()
    assert resolve_collision("a", ".html", used) == "a.html"
    assert resolve_collision("a", ".html", used) == "a-2.html"
    assert resolve_collision("a", ".html", used) == "a-3.html"
