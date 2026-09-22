"""LLM client: structured-output conversion calls with a validation retry loop."""

import json
from dataclasses import dataclass, field
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from llm_file_converter.models import (
    MetadataSpec,
    build_output_model,
    output_json_schema,
)

_SYSTEM_MESSAGE = (
    "You are a precise document conversion engine. "
    "Always respond with a single JSON object that matches the requested schema. "
    "Never wrap the JSON in markdown code fences or add commentary."
)


@dataclass
class ConversionSuccess:
    """Result of a successful LLM conversion."""

    result: BaseModel
    prompt_tokens: int = 0
    completion_tokens: int = 0


@dataclass
class ConversionError(Exception):
    """Raised when the LLM conversion fails after all retries."""

    message: str
    attempts: int = 0
    last_response: str | None = field(default=None)

    def __str__(self) -> str:
        return self.message


def _extract_content(response: Any) -> str:
    content = response.choices[0].message.content
    if not content:
        msg = "LLM returned an empty response"
        raise ConversionError(msg)
    return content


async def convert_content(
    client: AsyncOpenAI,
    *,
    model: str,
    prompt: str,
    spec: MetadataSpec,
    temperature: float = 0.0,
    max_tokens: int = 8192,
    max_retries: int = 2,
) -> ConversionSuccess:
    """Run one structured-output conversion call, retrying on validation errors.

    On a malformed response or pydantic ``ValidationError``, the error is fed
    back to the model and the request is retried up to ``max_retries`` times.
    Raises ``ConversionError`` when all attempts fail.
    """
    output_model = build_output_model(spec)
    schema = output_json_schema(spec)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": _SYSTEM_MESSAGE},
        {"role": "user", "content": prompt},
    ]

    prompt_tokens = 0
    completion_tokens = 0
    last_error: str | None = None

    for _attempt in range(1 + max_retries):
        if last_error is not None:
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "Your previous response was invalid. Error: "
                        f"{last_error}\nRespond again with a valid JSON object only."
                    ),
                }
            )

        response = await client.chat.completions.create(
            model=model,
            messages=messages,  # type: ignore[arg-type]
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "conversion_result", "schema": schema},
            },
            temperature=temperature,
            max_tokens=max_tokens,
        )

        if response.usage is not None:
            prompt_tokens += response.usage.prompt_tokens
            completion_tokens += response.usage.completion_tokens

        try:
            content = _extract_content(response)
        except ConversionError:
            raise
        try:
            parsed = output_model.model_validate(json.loads(content))
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = str(e)
            messages.append({"role": "assistant", "content": content})
            continue

        return ConversionSuccess(
            result=parsed,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )

    msg = f"LLM conversion failed after {1 + max_retries} attempts: {last_error}"
    raise ConversionError(msg, attempts=1 + max_retries, last_response=last_error)
