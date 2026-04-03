from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class BaseArtifactBuilder(ABC):
    def __init__(self, label_field: str = "label") -> None:
        self.label_field = label_field

    @abstractmethod
    def build(
        self,
        predictions: list[Any],
        references: list[Any],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        """Create artifacts and return local artifact file paths."""
