import time
from typing import Type, TypedDict, TypeVar
from uuid import uuid4

import numpy as np
from loguru import logger
from ollama import Client
from pydantic import BaseModel

from common.singleton_meta import SingletonMeta
from config import conf

T = TypeVar("T", bound=BaseModel)


class ModelDict(TypedDict):
    llm: str
    vlm: str
    emb: str


class ModelParams(TypedDict):
    llm: dict
    vlm: dict
    emb: dict


class OllamaRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # Ollama Connection
            ollamac = Client(host=f"{conf.ollama.host}:{conf.ollama.port}")

            # ensure connection to Ollama works
            if not ollamac.list():
                raise Exception(
                    f"Cant connect to Ollama on {conf.ollama.host}:{conf.ollama.port}"
                )
            cls.__model: ModelDict = {
                "llm": "",
                "vlm": "",
                "emb": "",
            }
            cls.__default_kwargs: ModelParams = {"llm": {}, "vlm": {}, "emb": {}}
            cls.__client = ollamac

            # check if the configured models are available
            available_models = [x.model for x in ollamac.list()["models"]]
            logger.info(f"Available models: {available_models}")
            for model_type in ["llm", "vlm", "emb"]:
                model_name = conf.ollama[model_type].model
                if model_name not in available_models:
                    logger.info(
                        f"Model {model_name} is not available. Downloading it..."
                    )
                    ollamac.pull(model_name)
                    logger.info(
                        f"{model_type.capitalize()} Model {model_name} has been downloaded successfully."
                    )

            # ensure that the models are available
            available_models = [x.model for x in ollamac.list()["models"]]
            logger.info(f"Available models: {available_models}")
            for model_type in ["llm", "vlm", "emb"]:
                model_name = conf.ollama[model_type].model
                if model_name not in available_models:
                    raise RuntimeError(
                        f"{model_type.capitalize()} Model {model_name} is not available. Available models are: {available_models}"
                    )

                cls.__model[model_type] = model_name
                cls.__default_kwargs[model_type] = conf.ollama[
                    model_type
                ].default_params
                logger.info(
                    f"Default parameters for {model_type} {model_name}: {cls.__default_kwargs[model_type]}"
                )

            cls.__llm_chat_sessions: dict[str, list[dict]] = dict()
            cls.__llm_chat_session_timestamps: dict[str, float] = dict()
            cls.__max_llm_chat_sessions = 50
            cls.__max_llm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

            cls.__vlm_chat_sessions: dict[str, list[dict]] = dict()
            cls.__vlm_chat_session_timestamps: dict[str, float] = dict()
            cls.__max_vlm_chat_sessions = 50
            cls.__max_vlm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

            # load the model with a dummy request to ensure that it is loaded and ready to use
            response = ollamac.chat(
                model=cls.__model["llm"],
                messages=[
                    {
                        "role": "system",
                        "content": "You are kind and helpful.",
                    },
                    {
                        "role": "user",
                        "content": "Hi!",
                    },
                ],
                options=cls.__default_kwargs["llm"],
            )
            logger.info(response.message.content)

        except Exception as e:
            msg = f"Cannot instantiate OllamaService - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully established connection to Ollama!")

        return super(OllamaRepo, cls).__new__(cls)

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
        gen_kwargs: dict[str, str] | None = None,
        session_id: str | None = None,
    ) -> tuple[str | T, str]:
        if gen_kwargs is None:
            gen_kwargs = self.__default_kwargs["llm"]

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
        response = self.__client.chat(
            model=self.__model["llm"],
            messages=messages,
            format=response_model_schema,
            options=gen_kwargs,
            stream=False,
        )
        max_context_size = int(gen_kwargs.get("num_ctx", "-1"))
        if (
            max_context_size != -1
            and response.prompt_eval_count is not None
            and response.prompt_eval_count > max_context_size
        ):
            raise Exception(
                f"Your input is too long! Max context size of {max_context_size} exceeded. Cannot process your request."
            )
        if response.message.content is None:
            raise RuntimeWarning(f"Ollama response is None: {response}")
        messages.append(response.message.model_dump())

        # update chat history
        self.__llm_chat_sessions[session_id] = messages

        if response_model is None:
            return response.message.content, session_id
        try:
            return response_model.model_validate_json(
                response.message.content
            ), session_id
        except Exception as e:
            logger.error(f"Error while validating Ollama response: {e}")
            return response.message.content, session_id

    def llm_chat(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        gen_kwargs: dict[str, str] | None = None,
    ) -> T:
        if gen_kwargs is None:
            gen_kwargs = self.__default_kwargs["llm"]

        response = self.__client.chat(
            model=self.__model["llm"],
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
            options=gen_kwargs,
            format=response_model.model_json_schema(),
        )
        max_context_size = int(gen_kwargs.get("num_ctx", "-1"))
        if (
            max_context_size != -1
            and response.prompt_eval_count is not None
            and response.prompt_eval_count > max_context_size
        ):
            raise Exception(
                f"Your input is too long! Max context size of {max_context_size} exceeded. Cannot process your request."
            )
        if response.message.content is None:
            raise Exception(f"Ollama response is None: {response}")

        return response_model.model_validate_json(response.message.content)

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
        gen_kwargs: dict[str, str] | None = None,
        session_id: str | None = None,
    ) -> tuple[str | T, str]:
        if gen_kwargs is None:
            gen_kwargs = self.__default_kwargs["vlm"]

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
        response = self.__client.chat(
            model=self.__model["vlm"],
            messages=messages,
            format=response_model_schema,
            options=gen_kwargs,
            stream=False,
        )
        if response.message.content is None:
            raise RuntimeWarning(f"Ollama response is None: {response}")
        messages.append(response.message.model_dump())

        # update chat history
        self.__vlm_chat_sessions[session_id] = messages

        if response_model is None:
            return response.message.content, session_id
        try:
            return response_model.model_validate_json(
                response.message.content
            ), session_id
        except Exception as e:
            logger.error(f"Error while validating Ollama response: {e}")
            return response.message.content, session_id

    def llm_embed(
        self,
        inputs: list[str],
        options: dict[str, str] | None = None,
    ) -> np.ndarray:
        if options is None:
            options = self.__default_kwargs["emb"]

        response = self.__client.embed(
            model=self.__model["emb"], input=inputs, options=options
        )
        return np.array(response.embeddings)

    def close_connection(self):
        """
        Close the connection to the Ollama client.
        """
        self.__client._client.close()
