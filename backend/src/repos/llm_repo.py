import time
from typing import Tuple, Type, TypedDict, TypeVar
from uuid import uuid4

import numpy as np
from loguru import logger
from openai import OpenAI
from pydantic import BaseModel

from common.singleton_meta import SingletonMeta
from config import conf

T = TypeVar("T", bound=BaseModel)


class ModelDict(TypedDict):
    llm: Tuple[str, OpenAI]
    vlm: Tuple[str, OpenAI]
    emb: Tuple[str, OpenAI]


class LLMRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.__models: ModelDict = {}  # type: ignore

        cls.__llm_chat_sessions: dict[str, list[dict]] = dict()
        cls.__llm_chat_session_timestamps: dict[str, float] = dict()
        cls.__max_llm_chat_sessions = 50
        cls.__max_llm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        cls.__vlm_chat_sessions: dict[str, list[dict]] = dict()
        cls.__vlm_chat_session_timestamps: dict[str, float] = dict()
        cls.__max_vlm_chat_sessions = 50
        cls.__max_vlm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        try:
            for model_type in ("llm", "vlm", "emb"):
                settings = conf.vllm[model_type]
                conn = OpenAI(
                    base_url=f"http://{settings.host}:{settings.port}/v1",
                    api_key="no-key-needed-for-vllm",
                )
                models = conn.models.list().data
                if len(models) == 0:
                    raise Exception(
                        f"No model loaded at '{settings.host}:{settings.port}'!"
                    )
                model = models[0]
                if model.id != settings.model:
                    raise Exception(
                        f"Wrong model loaded at '{settings.host}:{settings.port}'! Expected '{settings.model}', but got '{model.id}'!"
                    )
                cls.__models[model_type] = (model.id, conn)

        except Exception as e:
            msg = f"Cannot instantiate LLMRepo - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully established connection to VLLM!")

        return super(LLMRepo, cls).__new__(cls)

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
        user_prompt: str,
        system_prompt: str | None = None,
        response_model: Type[T] | None = None,
        session_id: str | None = None,
    ) -> tuple[str | T, str]:
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
        model, client = self.__models["llm"]
        response = client.chat.completions.create(
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
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        model, client = self.__models["llm"]
        response = client.chat.completions.create(
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
        user_prompt: str,
        b64_images: list[str] | None = None,
        system_prompt: str | None = None,
        response_model: Type[T] | None = None,
        session_id: str | None = None,
    ) -> tuple[str | T, str]:
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
        # build user message
        user_message: dict = {
            "role": "user",
            "content": user_prompt.strip(),
        }
        if b64_images is not None and len(b64_images) > 0:
            user_message["images"] = b64_images
        messages.append(user_message)

        # get response
        response_model_schema = None
        if response_model is not None:
            response_model_schema = response_model.model_json_schema()

        model, client = self.__models["vlm"]
        response = client.chat.completions.create(
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
        model, client = self.__models["emb"]
        res = client.embeddings.create(model=model, input=inputs)
        return np.array([emb.embedding for emb in res.data])

    def close_connection(self):
        """
        Close the connection to the LLM client.
        """
        for val in self.__models.values():
            val[1].close()  # type: ignore
