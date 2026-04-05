from importlib import import_module

from pydantic import BaseModel

from schemas.prediction.prediction_schema import BaseAnswerSchema


def _get_module_candidates(schema_module_name: str) -> list[str]:
    if schema_module_name.startswith("schemas."):
        return [schema_module_name]

    candidates = [f"schemas.{schema_module_name}"]
    if "." not in schema_module_name:
        candidates.append(f"schemas.prediction.{schema_module_name}")

    return list(dict.fromkeys(candidates))


def _import_schema_module(schema_module_name: str):
    candidates = _get_module_candidates(schema_module_name)

    for import_name in candidates:
        try:
            return import_module(import_name)
        except ModuleNotFoundError as exc:
            # Only continue to next candidate if the missing module is the attempted
            # import itself; otherwise propagate errors from nested imports.
            if exc.name != import_name:
                raise

    tried = ", ".join(candidates)
    raise ModuleNotFoundError(
        f"Could not import schema module '{schema_module_name}'. Tried: {tried}."
    )


def resolve_answer_schema(answer_schema: str) -> type[BaseAnswerSchema]:
    if "." not in answer_schema:
        raise ValueError(
            f"Key 'answer_schema' must be '<module>.<ClassName>', got '{answer_schema}'."
        )

    schema_module_name, schema_class_name = answer_schema.rsplit(".", 1)
    module = _import_schema_module(schema_module_name)

    try:
        schema_class = getattr(module, schema_class_name)
    except AttributeError as exc:
        raise AttributeError(
            f"Schema class '{schema_class_name}' not found in module '{module.__name__}'."
        ) from exc

    if not issubclass(schema_class, BaseModel):
        raise TypeError(
            f"answer_schema '{answer_schema}' must resolve to a pydantic BaseModel class."
        )

    if not issubclass(schema_class, BaseAnswerSchema):
        raise TypeError(
            f"answer_schema '{answer_schema}' must inherit from BaseAnswerSchema and implement get_prediction()."
        )

    return schema_class
