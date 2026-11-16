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
        check_core.main(root, module_exceptions={})

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

    check_core.main(root, module_exceptions={})

    assert "passed" in capsys.readouterr().out


def test_no_system_may_import_a_module(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """A system that imports a module is a violation; there is no exemption."""
    root = _src(
        tmp_path,
        {
            "systems/feature_system/feature_service.py": (
                "from modules.word_frequency.word_frequency_dto import X\n"
            ),
        },
    )

    with pytest.raises(SystemExit):
        check_core.main(root, module_exceptions={})

    assert "imports from modules" in capsys.readouterr().out


def test_a_module_must_not_import_another_module(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """A module importing another module, also inside a function, is a
    violation naming both; its own imports are fine."""
    root = _src(
        tmp_path,
        {
            "modules/rag/rag_service.py": (
                "from modules.rag.rag_dto import X\n"
                "def f():\n"
                "    from modules.simsearch.simsearch_service import S\n"
            ),
        },
    )

    with pytest.raises(SystemExit):
        check_core.main(root, module_exceptions={})

    out = capsys.readouterr().out
    assert "module 'rag' imports module 'simsearch'" in out
    assert "Line 3" in out
    assert "rag_dto" not in out


@pytest.mark.parametrize(
    "source",
    [
        # one line, with an alias
        pytest.param("from modules import simsearch as s\n", id="from-modules-import"),
        # parenthesized over several lines, after the module's own name
        pytest.param(
            "from modules import (\n    rag,\n    simsearch,\n)\n",
            id="from-modules-import-multiline",
        ),
    ],
)
def test_a_module_must_not_import_another_module_from_the_package(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], source: str
):
    """`from modules import b` imports module b as well."""
    root = _src(tmp_path, {"modules/rag/rag_service.py": source})

    with pytest.raises(SystemExit):
        check_core.main(root, module_exceptions={})

    out = capsys.readouterr().out
    assert "module 'rag' imports module 'simsearch'" in out
    assert "module 'rag' imports module 'rag'" not in out


def test_a_listed_module_import_is_allowed(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    root = _src(
        tmp_path,
        {
            "modules/eximport/export_service.py": (
                "from modules.whiteboard.whiteboard_crud import crud_whiteboard\n"
            ),
        },
    )

    check_core.main(root, module_exceptions={("eximport", "whiteboard"): "reason"})

    assert "passed" in capsys.readouterr().out


def test_an_exception_that_no_longer_occurs_fails(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """A listed pair without an import is stale and must be removed."""
    root = _src(tmp_path, {"modules/eximport/export_service.py": "x = 1\n"})

    with pytest.raises(SystemExit):
        check_core.main(root, module_exceptions={("eximport", "whiteboard"): "reason"})

    assert "Stale exception: module 'eximport'" in capsys.readouterr().out


def test_the_module_import_exceptions_are_exactly_the_current_imports(
    capsys: pytest.CaptureFixture[str],
):
    """The real source tree passes with the listed exceptions."""
    check_core.main()

    assert "passed" in capsys.readouterr().out
