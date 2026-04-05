import asyncio
from typing import Any

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel
from tqdm.asyncio import tqdm_asyncio

from schemas.prediction.prediction_schema import BaseAnswerSchema


async def _fetch_completion(
    client: AsyncOpenAI,
    prompt: str,
    system_prompt: str | None,
    schema: type[BaseAnswerSchema],
    model_alias: str,
    temperature: float,
) -> str:
    messages: list[ChatCompletionMessageParam] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat.completions.create(
        model=model_alias,
        messages=messages,
        temperature=temperature,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": schema.__name__,
                "schema": schema.model_json_schema(),
                "strict": True,
            },
        },
    )

    content: Any = response.choices[0].message.content
    return "" if content is None else str(content).strip()


async def run_batch_inference(
    prompts: list[str],
    system_prompt: str | None,
    schema: type[BaseAnswerSchema],
    model_alias: str,
    base_url: str,
    api_key: str,
    concurrency: int,
    temperature: float,
) -> list[str]:
    client = AsyncOpenAI(base_url=base_url, api_key=api_key)
    semaphore = asyncio.Semaphore(concurrency)

    # Show the schema that is used for all following responses for better visibility in logs
    print(f"Using response schema:\n{schema.model_json_schema()}\n{'-' * 60}")

    async def _run_one(prompt: str) -> str:
        async with semaphore:
            return await _fetch_completion(
                client=client,
                prompt=prompt,
                system_prompt=system_prompt,
                schema=schema,
                model_alias=model_alias,
                temperature=temperature,
            )

    tasks = [_run_one(prompt) for prompt in prompts]
    return await tqdm_asyncio.gather(
        *tasks, desc="Running inference", total=len(prompts)
    )
