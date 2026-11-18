import time
from concurrent.futures import Future, ThreadPoolExecutor, wait
from typing import Any, Generic, Type, TypeVar
from uuid import uuid4

import numpy as np
import openai
from loguru import logger
from openai import OpenAI
from openai.types.chat import ChatCompletion, ChatCompletionMessageParam
from pydantic import BaseModel

from common.singleton_meta import SingletonMeta
from config import conf
from repos.llm_enum import ProviderType
from repos.repo_base import RepoBase

T = TypeVar("T", bound=BaseModel)

# the requests of a batch chat that run in parallel, the others wait for a free
# worker
BATCH_CHAT_MAX_WORKERS = 100


class LLMMessage(BaseModel):
    system_prompt: str | None = None
    user_prompt: str


class LLMBatchChatResponse(Generic[T]):
    """Result of a single LLM batch chat request.

    Either `parsed` (the validated response model) or `error` is set.
    `raw` always contains the raw response content (or error details).
    `unavailable` tells a failed request whose LLM could not answer it now (it
    could not be reached, timed out or failed with a server error) from one
    that fails on every attempt (e.g. an exceeded context window).
    """

    def __init__(
        self,
        *,
        raw: str | None,
        parsed: T | None = None,
        error: str | None = None,
        unavailable: bool = False,
    ):
        self.raw = raw
        self.parsed = parsed
        self.error = error
        self.unavailable = unavailable

    @property
    def is_error(self) -> bool:
        return self.error is not None


class LLMRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize LLMRepo.
        """
        RepoBase.__init__(self)
        self.__llm_conn: OpenAI | None = None
        self.__llm_chat_sessions: dict[str, list[dict]] = dict()
        self.__llm_chat_session_timestamps: dict[str, float] = dict()
        self.__max_llm_chat_sessions = 50
        self.__max_llm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        self.__vlm_chat_sessions: dict[str, list[dict]] = dict()
        self.__vlm_chat_session_timestamps: dict[str, float] = dict()
        self.__max_vlm_chat_sessions = 50
        self.__max_vlm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        self.__emb_conn: OpenAI | None = None

    def connect(self) -> None:
        """Establish connections to LLM Providers."""
        if self.__llm_conn is not None:
            logger.debug("LLMRepo already connected, skipping")
            return

        try:
            for provider_type, connection_info in (
                (ProviderType.LLM, conf.llm_provider),
                (ProviderType.EMB, conf.emb_provider),
            ):
                conn = OpenAI(
                    base_url=connection_info.url,
                    api_key=connection_info.api_key,
                )
                models = conn.models.list().data
                if len(models) == 0:
                    raise Exception(f"No model found at '{connection_info.url}'!")
                match provider_type:
                    case ProviderType.LLM:
                        self.__llm_conn = conn
                    case ProviderType.EMB:
                        self.__emb_conn = conn
                logger.info(
                    f"Successfully established connection to LLM Provider '{provider_type}' at '{connection_info.url}' with the following models: {[model.id for model in models]}"
                )

        except Exception as e:
            msg = f"Cannot instantiate LLMRepo - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def close_connection(self) -> None:
        """
        Close connections to LLM Providers.
        Currently, this does nothing as OpenAI client doesn't require explicit closing.
        """
        if self.__llm_conn is None:
            logger.debug("LLMRepo already closed, skipping")
            return

        logger.info("Closing connections to LLM Providers...")
        self.__llm_conn = None
        self.__emb_conn = None

    def remove_data(self) -> None:
        """
        Reset/clear LLM chat sessions. This clears all chat session data.
        """
        logger.info("Resetting LLM chat sessions...")
        self.__llm_chat_sessions.clear()
        self.__llm_chat_session_timestamps.clear()
        self.__vlm_chat_sessions.clear()
        self.__vlm_chat_session_timestamps.clear()

    def _fetch_available_models(self, provider: ProviderType) -> list[str]:
        match provider:
            case ProviderType.LLM:
                conn = self.__llm_conn
            case ProviderType.EMB:
                conn = self.__emb_conn

        if conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        return [model.id for model in conn.models.list().data]

    def _validate_llm_name(self, model: str) -> str:
        available_models = self._fetch_available_models(provider=ProviderType.LLM)
        if len(available_models) == 0:
            raise ValueError("No LLM models available.")
        # this allows the user to specify "default" as the model name, which will use the first available model
        if model == "default":
            model = available_models[0]
        if model not in available_models:
            raise ValueError(
                f"Model '{model}' is not available. Available models: {available_models}"
            )
        return model

    def get_available_llms(self) -> list[str]:
        return self._fetch_available_models(provider=ProviderType.LLM)

    def _start_llm_chat_session(self) -> str:
        session_id = str(uuid4())
        logger.info(f"Started new LLM chat session {session_id}.")
        self.__llm_chat_sessions[session_id] = []
        self.__llm_chat_session_timestamps[session_id] = time.time()

        if len(self.__llm_chat_sessions) > self.__max_llm_chat_sessions:
            for session_id, timestamp in self.__llm_chat_session_timestamps.items():
                if time.time() - timestamp > self.__max_llm_chat_session_age:
                    logger.warning(
                        f"Removing session ID {session_id} due to age of {time.time() - timestamp} seconds."
                    )
                    self.__llm_chat_sessions.pop(session_id)
                    self.__llm_chat_session_timestamps.pop(session_id)

        return session_id

    def _get_llm_chat_session(self, session_id: str) -> list[dict]:
        history = self.__llm_chat_sessions.get(session_id, [])
        if len(history) == 0:
            logger.warning(f"Session ID {session_id} does not exist.")
        return history

    def llm_chat_with_session(
        self,
        model: str,
        user_prompt: str,
        system_prompt: str | None = None,
        response_model: Type[T] | None = None,
        session_id: str | None = None,
    ) -> tuple[str | T, str]:
        if self.__llm_conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        model = self._validate_llm_name(model)

        if session_id is None:
            session_id = self._start_llm_chat_session()
            messages = self.__llm_chat_sessions[session_id]
        else:
            messages = self.__llm_chat_sessions.get(session_id, None)
            if messages is None:
                logger.warning(
                    f"Session ID {session_id} is not valid. Creating a new session."
                )
                session_id = self._start_llm_chat_session()
                messages = self.__llm_chat_sessions[session_id]

        # only add system prompt if it is the first message
        if len(messages) == 0 and system_prompt is not None:
            messages.append(
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                }
            )
        # build user message
        user_message: dict = {
            "role": "user",
            "content": user_prompt.strip(),
        }
        messages.append(user_message)
        print(messages)
        print("" + "-" * 50)
        # get response
        if response_model is None:
            response = self.__llm_conn.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore
            )
        else:
            response = self.__llm_conn.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": response_model.__name__.lower(),
                        "schema": response_model.model_json_schema(),
                    },
                },
            )
        msg = response.choices[0].message
        if msg.content is None:
            raise Exception(f"VLLM response is None: {response}")
        messages.append(msg.model_dump())

        # update chat history
        self.__llm_chat_sessions[session_id] = messages

        if response_model is None:
            return msg.content, session_id
        try:
            return response_model.model_validate_json(msg.content), session_id
        except Exception as e:
            logger.error(f"Error while validating VLLM response: {e}")
            return msg.content, session_id

    def llm_chat(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        if self.__llm_conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        model = self._validate_llm_name(model)

        response = self.__llm_conn.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                },
                {
                    "role": "user",
                    "content": user_prompt.strip(),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__.lower(),
                    "schema": response_model.model_json_schema(),
                },
            },
        )
        msg = response.choices[0].message
        if msg.content is None:
            raise Exception(f"LLM response is None: {response}")

        return response_model.model_validate_json(msg.content)

    @staticmethod
    def is_unavailable(error: BaseException) -> bool:
        """Whether a request failed because the LLM could not answer it now: it
        could not be reached, timed out (`openai.APIConnectionError`) or failed
        with a server error (5xx). Other errors (4xx, e.g. an exceeded context
        window) fail on every attempt."""
        if isinstance(error, openai.APIConnectionError):
            return True
        return isinstance(error, openai.APIStatusError) and error.status_code >= 500

    def _completion_kwargs(
        self, model: str, response_model: Type[BaseModel]
    ) -> dict[str, Any]:
        """The arguments of the chat completion that all chat requests of a
        model and response model share."""
        return {
            "model": self._validate_llm_name(model),
            # "temperature": self.sampling_parameters.temperature,
            # "top_p": self.sampling_parameters.top_p,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__.lower(),
                    "schema": response_model.model_json_schema(),
                },
            },
        }

    @staticmethod
    def _chat_messages(message: LLMMessage) -> list[ChatCompletionMessageParam]:
        messages: list[ChatCompletionMessageParam] = []
        if message.system_prompt is not None:
            messages.append(
                {"role": "system", "content": message.system_prompt.strip()}
            )
        messages.append({"role": "user", "content": message.user_prompt.strip()})
        return messages

    @staticmethod
    def _parse_response(
        request: Future[ChatCompletion], response_model: Type[T], *, capture_raw: bool
    ) -> LLMBatchChatResponse[T]:
        """Parse the response of one finished chat completion request, or its
        failure.

        If capture_raw is False, a failed request or an invalid/unparseable
        response raises an exception and a successful one has raw=None. If
        capture_raw is True, a failure is returned with error set (and raw
        populated when available).
        """
        error = request.exception()
        if error is not None:
            if capture_raw:
                return LLMBatchChatResponse(
                    raw=None,
                    error=f"LLM request failed: {error}",
                    unavailable=LLMRepo.is_unavailable(error),
                )
            raise Exception(f"LLM request failed: {error}") from error
        response = request.result()
        if not response.choices:
            if capture_raw:
                return LLMBatchChatResponse(
                    raw=None, error=f"LLM response is invalid: {response}"
                )
            raise Exception(f"LLM response is invalid: {response}")
        msg = response.choices[0].message
        if msg.content is None:
            if capture_raw:
                return LLMBatchChatResponse(
                    raw=None, error=f"LLM response is None: {response}"
                )
            raise Exception(f"LLM response is None: {response}")
        try:
            return LLMBatchChatResponse(
                raw=msg.content if capture_raw else None,
                parsed=response_model.model_validate_json(msg.content),
            )
        except Exception as e:
            if capture_raw:
                return LLMBatchChatResponse(
                    raw=msg.content,
                    error=f"Failed to parse LLM response: {e}",
                )
            raise

    def llm_batch_chat(
        self,
        model: str,
        messages: list[LLMMessage],
        response_model: Type[T],
        *,
        capture_raw: bool = False,
    ) -> list[LLMBatchChatResponse[T]]:
        """Prompts the LLM in batch mode: sends all messages at once, up to
        `BATCH_CHAT_MAX_WORKERS` in parallel, and waits for all responses.

        Always returns one LLMBatchChatResponse per input message, in the order
        of the messages.

        If capture_raw is False (default), any failed request or invalid/
        unparseable response raises an exception and successful items are
        returned with raw=None.
        If capture_raw is True, failed items are returned as LLMBatchChatResponse
        with error set (and raw populated when available) instead of raising.

        On an exception in the calling thread while it waits (e.g. a stop of the
        job), the requests not started yet are never started and it returns
        without waiting for the ones in flight: their threads end with their
        request.
        """
        if self.__llm_conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        create = self.__llm_conn.chat.completions.create
        kwargs = self._completion_kwargs(model, response_model)
        executor = ThreadPoolExecutor(
            max_workers=BATCH_CHAT_MAX_WORKERS, thread_name_prefix="llm_batch_chat"
        )
        try:
            requests = [
                executor.submit(create, messages=self._chat_messages(message), **kwargs)
                for message in messages
            ]
            wait(requests)
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
        return [
            self._parse_response(request, response_model, capture_raw=capture_raw)
            for request in requests
        ]

    def _start_vlm_chat_session(self) -> str:
        session_id = str(uuid4())
        logger.info(f"Started new VLM chat session {session_id}.")
        self.__vlm_chat_sessions[session_id] = []
        self.__vlm_chat_session_timestamps[session_id] = time.time()

        if len(self.__vlm_chat_sessions) > self.__max_vlm_chat_sessions:
            for session_id, timestamp in self.__vlm_chat_session_timestamps.items():
                if time.time() - timestamp > self.__max_vlm_chat_session_age:
                    logger.warning(
                        f"Removing session ID {session_id} due to age of {time.time() - timestamp} seconds."
                    )
                    self.__vlm_chat_sessions.pop(session_id)
                    self.__vlm_chat_session_timestamps.pop(session_id)

        return session_id

    def _get_vlm_chat_session(self, session_id: str) -> list[dict]:
        history = self.__vlm_chat_sessions.get(session_id, [])
        if len(history) == 0:
            logger.warning(f"Session ID {session_id} is does not exist.")
        return history

    def vlm_chat(
        self,
        model: str,
        user_prompt: str,
        b64_images: list[str] | None = None,
        system_prompt: str | None = None,
        response_model: Type[T] | None = None,
        session_id: str | None = None,
    ) -> tuple[str | T, str]:
        if self.__llm_conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        model = self._validate_llm_name(model)

        if session_id is None:
            session_id = self._start_vlm_chat_session()
            messages = self.__vlm_chat_sessions[session_id]
        else:
            messages = self.__vlm_chat_sessions.get(session_id, None)
            if messages is None:
                logger.warning(
                    f"Session ID {session_id} is not valid. Creating a new session."
                )
                session_id = self._start_vlm_chat_session()
                messages = self.__vlm_chat_sessions[session_id]

        # only add system prompt if it is the first message
        if len(messages) == 0 and system_prompt is not None:
            messages.append(
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                }
            )
        # build content
        if b64_images is None or len(b64_images) == 0:
            content = user_prompt.strip()
        else:
            content = [{"type": "text", "text": user_prompt.strip()}]
            for img in b64_images:
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{img}"},
                    }  # type: ignore
                )

        # build user message
        user_message: dict = {
            "role": "user",
            "content": content,
        }
        messages.append(user_message)

        # get response
        if response_model is None:
            response = self.__llm_conn.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore
            )
        else:
            response = self.__llm_conn.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": response_model.__name__.lower(),
                        "schema": response_model.model_json_schema(),
                    },
                },
            )
        msg = response.choices[0].message
        if msg.content is None:
            raise RuntimeWarning(f"LLM response is None: {response}")
        messages.append(msg.model_dump())

        # update chat history
        self.__vlm_chat_sessions[session_id] = messages

        if response_model is None:
            return msg.content, session_id
        try:
            return response_model.model_validate_json(msg.content), session_id
        except Exception as e:
            logger.error(f"Error while validating LLM response: {e}")
            return msg.content, session_id

    def llm_embed(
        self,
        inputs: list[str],
    ) -> np.ndarray:
        if self.__emb_conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        available_models = self._fetch_available_models(provider=ProviderType.EMB)

        if len(available_models) == 0:
            raise ValueError("No embedding models are available.")

        model = available_models[0]  # use the first available embedding model
        res = self.__emb_conn.embeddings.create(model=model, input=inputs)
        return np.array([emb.embedding for emb in res.data])
