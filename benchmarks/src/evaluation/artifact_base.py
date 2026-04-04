import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Generic, Sequence, TypeVar, cast, get_args, get_origin

from schemas.answer_schema import BaseAnswerSchema
from schemas.reference_schema import BaseReferenceSchema

logger = logging.getLogger(__name__)

AnswerSchemaT = TypeVar("AnswerSchemaT", bound=BaseAnswerSchema)
ReferenceSchemaT = TypeVar("ReferenceSchemaT", bound=BaseReferenceSchema)


class BaseArtifactBuilder(Generic[AnswerSchemaT, ReferenceSchemaT], ABC):
    def __init__(self) -> None:
        self.answer_schema_cls = self._required_answer_schema()
        self.reference_schema_cls = self._required_reference_schema()

    def _required_answer_schema(self) -> type[AnswerSchemaT]:
        for cls in type(self).mro():
            for base in getattr(cls, "__orig_bases__", ()):
                origin = get_origin(base)
                if isinstance(origin, type) and issubclass(origin, BaseArtifactBuilder):
                    args = get_args(base)
                    if (
                        len(args) == 2
                        and isinstance(args[0], type)
                        and issubclass(args[0], BaseAnswerSchema)
                    ):
                        return cast(type[AnswerSchemaT], args[0])

        raise TypeError(
            f"{self.__class__.__name__}: unable to resolve required schema type from generic BaseArtifactBuilder[...]."
        )

    def _required_reference_schema(self) -> type[ReferenceSchemaT]:
        for cls in type(self).mro():
            for base in getattr(cls, "__orig_bases__", ()):
                origin = get_origin(base)
                if isinstance(origin, type) and issubclass(origin, BaseArtifactBuilder):
                    args = get_args(base)
                    if (
                        len(args) == 2
                        and isinstance(args[1], type)
                        and issubclass(args[1], BaseReferenceSchema)
                    ):
                        return cast(type[ReferenceSchemaT], args[1])

        raise TypeError(
            f"{self.__class__.__name__}: unable to resolve required reference schema type from generic BaseArtifactBuilder[...]."
        )

    def require_answer_schema(
        self,
        predictions: list[BaseAnswerSchema],
    ) -> list[AnswerSchemaT]:
        context = self.__class__.__name__
        typed_predictions: list[AnswerSchemaT] = []
        required_schema = self.answer_schema_cls

        for index, prediction in enumerate(predictions):
            if not isinstance(prediction, required_schema):
                raise TypeError(
                    f"{context}: expected {required_schema.__name__} predictions, "
                    f"got {type(prediction).__name__} at index {index}."
                )

            typed_predictions.append(cast(AnswerSchemaT, prediction))

        return typed_predictions

    def require_reference_schema(
        self,
        references: Sequence[BaseReferenceSchema],
    ) -> list[ReferenceSchemaT]:
        typed_references: list[ReferenceSchemaT] = []
        required_schema = self.reference_schema_cls

        for reference in references:
            if isinstance(reference, required_schema):
                typed_references.append(cast(ReferenceSchemaT, reference))
                continue

            typed_references.append(required_schema.create_from_reference(reference))

        return typed_references

    def discard_none_predictions(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: Sequence[BaseReferenceSchema],
    ) -> tuple[list[BaseAnswerSchema], list[BaseReferenceSchema]]:
        context = self.__class__.__name__
        if len(predictions) != len(references):
            raise ValueError(
                f"{context}: predictions and references must have identical length, "
                f"got {len(predictions)} and {len(references)}."
            )

        filtered_predictions: list[BaseAnswerSchema] = []
        filtered_references: list[BaseReferenceSchema] = []
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
    def build(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: Sequence[BaseReferenceSchema],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        """Create artifacts and return local artifact file paths."""
