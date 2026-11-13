import importlib.util
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_core.py"
_spec = importlib.util.spec_from_file_location("check_core", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_core = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_core)


def _src(tmp_path: Path, files: dict[str, str]) -> Path:
    """A source tree with the given files (path relative to src -> content)."""
    for name, content in files.items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    return tmp_path


def test_the_artefact_system_must_not_import_the_feature_system(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """An import of the feature system in the artefact system, also inside a
    function, is a violation that names the forbidden package."""
    root = _src(
        tmp_path,
        {
            "systems/artefact_system/artefact_service.py": (
                "def f():\n"
                "    from systems.feature_system.feature_service import FeatureService\n"
            ),
        },
    )

    with pytest.raises(SystemExit):
        check_core.main(root)

    out = capsys.readouterr().out
    assert "imports from systems.feature_system" in out
    assert "Line 2" in out


def test_the_feature_system_may_import_the_artefact_system(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """The feature system talks to the artefact system: that import is fine."""
    root = _src(
        tmp_path,
        {
            "systems/feature_system/feature_service.py": (
                "from systems.artefact_system.artefact_service import ArtefactService\n"
            ),
        },
    )

    check_core.main(root)

    assert "passed" in capsys.readouterr().out


def test_no_system_may_import_a_module(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """A system that imports a module is a violation; there is no exemption."""
    root = _src(
        tmp_path,
        {
            "systems/feature_system/feature_service.py": (
                "from modules.doc_processing.doc_processing_dto import X\n"
            ),
        },
    )

    with pytest.raises(SystemExit):
        check_core.main(root)

    assert "imports from modules" in capsys.readouterr().out
