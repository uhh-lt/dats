"""The layout of the modules after the artefacts moved to their owners: the
standard pipeline lives in `core/doc_processing`, every single-user artefact in
the module of its feature, so `modules/doc_processing` is gone (that core
imports no module is `lint/check_core.py`)."""

from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"


def test_modules_doc_processing_holds_no_file():
    """No file lies below `modules/doc_processing`; a new step goes to
    `core/doc_processing` or to the module of its feature."""
    folder = SRC / "modules" / "doc_processing"
    files = [
        p for p in folder.rglob("*") if p.is_file() and "__pycache__" not in p.parts
    ]

    assert files == []
