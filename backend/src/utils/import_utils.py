import glob
import importlib
import os
from types import ModuleType


def import_by_suffix(suffix: str) -> list[ModuleType]:
    """Import every module below `src` whose file name ends in `suffix`, except
    the migrations: a migration file is never imported by a scan (e.g.
    `..._per_feature.py` would match `_feature.py`)."""
    root_dir = os.path.dirname(os.path.dirname(__file__))
    # glob returns paths in arbitrary, filesystem-dependent order.
    # Sort them so module discovery is deterministic.
    paths = sorted(
        (
            p
            for p in glob.iglob(rf"**/*{suffix}", recursive=True, root_dir=root_dir)
            if not p.startswith("migrations/")
        ),
        key=lambda p: (os.path.basename(p), p),
    )
    modules = [
        importlib.import_module(module.replace("/", ".").replace(".py", ""))
        for module in paths
    ]

    return modules
