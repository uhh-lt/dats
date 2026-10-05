import glob
import importlib
import os
from types import ModuleType


def import_by_suffix(suffix: str) -> list[ModuleType]:
    root_dir = os.path.dirname(os.path.dirname(__file__))
    # glob returns paths in arbitrary, filesystem-dependent order.
    # Sort them so module discovery is deterministic.
    paths = sorted(
        glob.iglob(rf"**/*{suffix}", recursive=True, root_dir=root_dir),
        key=lambda p: (os.path.basename(p), p),
    )
    modules = [
        importlib.import_module(module.replace("/", ".").replace(".py", ""))
        for module in paths
    ]

    return modules
