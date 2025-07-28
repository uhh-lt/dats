import glob
import importlib
import os
from types import ModuleType


def import_by_suffix(suffix: str) -> list[ModuleType]:
    root_dir = os.path.join(os.path.dirname(__file__), "../")
    modules = [
        importlib.import_module(module.replace("/", ".").replace(".py", ""))
        for module in glob.iglob(rf"**/*{suffix}", recursive=True, root_dir=root_dir)
    ]

    return modules
