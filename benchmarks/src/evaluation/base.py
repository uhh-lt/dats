from abc import ABC, abstractmethod
from typing import Any


class BaseMetricWrapper(ABC):
    def __init__(self, label_field: str = "label") -> None:
        self.label_field = label_field

    @abstractmethod
    def compute(
        self, predictions: list[Any], references: list[Any]
    ) -> dict[str, float]:
        """Return metric names and values for a prediction/reference pair list."""
