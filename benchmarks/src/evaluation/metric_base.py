import logging
from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar, cast, get_args, get_origin

from schemas.answer_schema import BaseAnswerSchema

logger = logging.getLogger(__name__)

SchemaT = TypeVar("SchemaT", bound=BaseAnswerSchema)


class BaseMetricWrapper(Generic[SchemaT], ABC):
    def _required_schema(self) -> type[SchemaT]:
        for cls in type(self).mro():
            for base in getattr(cls, "__orig_bases__", ()):
                if get_origin(base) is BaseMetricWrapper:
                    args = get_args(base)
                    if (
                        args
                        and isinstance(args[0], type)
                        and issubclass(args[0], BaseAnswerSchema)
                    ):
                        return cast(type[SchemaT], args[0])

        raise TypeError(
            f"{self.__class__.__name__}: unable to resolve required schema type from generic BaseMetricWrapper[...]."
        )

    def require_answer_schema(
        self,
        predictions: list[BaseAnswerSchema],
    ) -> list[SchemaT]:
        context = self.__class__.__name__
        typed_predictions: list[SchemaT] = []
        required_schema = self._required_schema()

        for index, prediction in enumerate(predictions):
            if not isinstance(prediction, required_schema):
                raise TypeError(
                    f"{context}: expected {required_schema.__name__} predictions, "
                    f"got {type(prediction).__name__} at index {index}."
                )

            typed_predictions.append(cast(SchemaT, prediction))

        return typed_predictions

    def discard_none_predictions(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
    ) -> tuple[list[BaseAnswerSchema], list[Any]]:
        context = self.__class__.__name__
        if len(predictions) != len(references):
            raise ValueError(
                f"{context}: predictions and references must have identical length, "
                f"got {len(predictions)} and {len(references)}."
            )

        filtered_predictions: list[BaseAnswerSchema] = []
        filtered_references: list[Any] = []
        discarded_count = 0

        for prediction, reference in zip(predictions, references):
            if prediction is None:
                discarded_count += 1
                continue

            filtered_predictions.append(prediction)
            filtered_references.append(reference)

        if discarded_count > 0:
            logger.warning(
                "%s: DISCARDED %d answers because prediction was None.",
                context,
                discarded_count,
            )

        return filtered_predictions, filtered_references

    @abstractmethod
    def compute(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
    ) -> dict[str, float]:
        """Return metric names and values for a prediction/reference pair list."""
