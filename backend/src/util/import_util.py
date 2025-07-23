import glob
import importlib
from types import ModuleType


def import_by_suffix(suffix: str) -> list[ModuleType]:
    modules = [
        importlib.import_module(module.replace("/", ".").replace(".py", ""))
        for module in glob.iglob(rf"**/*{suffix}", recursive=True, root_dir="../src")
    ]

    return modules
