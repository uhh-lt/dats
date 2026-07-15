import time
from typing import Type, TypeVar
from uuid import uuid4

import numpy as np
from litellm import batch_completion
from loguru import logger
from openai import OpenAI
from pydantic import BaseModel

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase

T = TypeVar("T", bound=BaseModel)


class LLMMessage(BaseModel):
    system_prompt: str
    user_prompt: str


class LLMRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize LLMRepo.
        """
        RepoBase.__init__(self)
        self.__llm_conn: OpenAI | None = None
        self.__llm_models: list[str] = []
        self.__llm_chat_sessions: dict[str, list[dict]] = dict()
        self.__llm_chat_session_timestamps: dict[str, float] = dict()
        self.__max_llm_chat_sessions = 50
        self.__max_llm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        self.__vlm_chat_sessions: dict[str, list[dict]] = dict()
        self.__vlm_chat_session_timestamps: dict[str, float] = dict()
        self.__max_vlm_chat_sessions = 50
        self.__max_vlm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        self.__emb_conn: OpenAI | None = None
        self.__emb_models: list[str] = []

    def connect(self) -> None:
        """Establish connections to LLM Providers."""
        if self.__llm_conn is not None:
            logger.debug("LLMRepo already connected, skipping")
            return

        try:
            for provider_type, connection_info in (
                ("llm", conf.llm_provider),
                ("emb", conf.emb_provider),
            ):
                conn = OpenAI(
                    base_url=f"http://{connection_info.host}:{connection_info.port}/v1",
                    api_key=connection_info.api_key,
                )
                models = conn.models.list().data
                if len(models) == 0:
                    raise Exception(
                        f"No model found at '{connection_info.host}:{connection_info.port}'!"
                    )
                if provider_type == "llm":
                    self.__llm_models = [m.id for m in models]
                    self.__llm_conn = conn
                elif provider_type == "emb":
                    self.__emb_models = [m.id for m in models]
                    self.__emb_conn = conn
                logger.info(
                    f"Successfully established connection to LLM Provider '{provider_type}' at '{connection_info.host}:{connection_info.port}' with the following models: {[model.id for model in models]}"
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

    def __validate_llm_name(self, model: str) -> str:
        if len(self.__llm_models) == 0:
            raise ValueError("No LLM models available.")
        if model not in self.__llm_models:
            raise ValueError(
                f"Model '{model}' is not available. Available models: {self.__llm_models}"
            )
        # this allows the user to specify "default" as the model name, which will use the first available model
        if model == "default":
            model = self.__llm_models[0]
        return model

    def get_available_models(self) -> list[str]:
        return list(self.__llm_models)

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

        model = self.__validate_llm_name(model)

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
        response_model_schema = None
        if response_model is not None:
            response_model_schema = response_model.model_json_schema()
        response = self.__llm_conn.chat.completions.create(
            model=model,
            messages=messages,  # type: ignore
            extra_body={"guided_json": response_model_schema},
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

        model = self.__validate_llm_name(model)

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
            extra_body={"guided_json": response_model.model_json_schema()},
        )
        msg = response.choices[0].message
        if msg.content is None:
            raise Exception(f"LLM response is None: {response}")

        return response_model.model_validate_json(msg.content)

    def llm_batch_chat(
        self,
        model: str,
        messages: list[LLMMessage],
        response_model: Type[T],
    ) -> list[T]:
        if self.__llm_conn is None:
            raise RuntimeError("LLMRepo is not connected. Call connect() first.")

        model = self.__validate_llm_name(model)

        # prepare batch messages
        batch_messages = [
            [
                {
                    "role": "system",
                    "content": message.system_prompt.strip(),
                },
                {
                    "role": "user",
                    "content": message.user_prompt.strip(),
                },
            ]
            for message in messages
        ]

        # do batch inference
        batch_responses = batch_completion(
            model=f"hosted_vllm/{model}",
            messages=batch_messages,
            base_url=str(self.__llm_conn.base_url),
            api_key=self.__llm_conn.api_key,
            # temperature=self.sampling_parameters.temperature,
            # top_p=self.sampling_parameters.top_p,
            extra_body={"guided_json": response_model.model_json_schema()},
        )

        # parse responses
        responses: list[T] = []
        for response in batch_responses:
            if response.get("choices", None) is None:
                raise Exception(f"LLM response is invalid: {response}")
            msg = response.choices[0].message
            if msg.content is None:
                raise Exception(f"LLM response is None: {response}")
            responses.append(response_model.model_validate_json(msg.content))

        return responses

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

        model = self.__validate_llm_name(model)

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
        response_model_schema = None
        if response_model is not None:
            response_model_schema = response_model.model_json_schema()

        response = self.__llm_conn.chat.completions.create(
            model=model,
            messages=messages,  # type: ignore
            extra_body={"guided_json": response_model_schema},
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

        if len(self.__emb_models) == 0:
            raise ValueError("No embedding models are available.")

        model = self.__emb_models[0]  # use the first available embedding model
        res = self.__emb_conn.embeddings.create(model=model, input=inputs)
        return np.array([emb.embedding for emb in res.data])
