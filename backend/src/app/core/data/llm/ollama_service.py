import time
from typing import Type, TypeVar
from uuid import uuid4

from loguru import logger
from ollama import Client
from pydantic import BaseModel

from app.util.singleton_meta import SingletonMeta
from config import conf

T = TypeVar("T", bound=BaseModel)


class OllamaService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # Ollama Connection
            ollamac = Client(host=f"{conf.ollama.host}:{conf.ollama.port}")

            # ensure connection to Ollama works
            if not ollamac.list():
                raise Exception(
                    f"Cant connect to Ollama on {conf.ollama.host}:{conf.ollama.port}"
                )
            cls.__model = dict()
            cls.__client = ollamac

            # ensure that the configured models are available
            available_models = [x.model for x in ollamac.list()["models"]]
            logger.info(f"Available models: {available_models}")
            for model_type in ["llm", "vlm"]:
                model_name = conf.ollama.model.get(model_type, None)
                if model_name is None:
                    raise RuntimeError(
                        f"{model_type.capitalize()} Model is not configured. Please set the model in the config file."
                    )
                if model_name not in available_models:
                    logger.info(f"Model {model_name} is not available. Creating it...")
                    context_size = conf.ollama.context_size.get(model_type, None)
                    if context_size is not None:
                        logger.info(
                            f"Creating custom {model_type.capitalize()} model {model_name}..."
                        )
                        ollamac.create(
                            "custom-" + model_name,
                            from_=model_name,
                            parameters={
                                "num_ctx": context_size,
                            },
                        )
                    else:
                        logger.info(
                            f"Creating {model_type.capitalize()} model {model_name}..."
                        )
                        ollamac.create(
                            model_name,
                            from_=model_name,
                        )

                    logger.info(
                        f"{model_type.capitalize()} Model {model_name} has been created successfully."
                    )

            available_models = [x.model for x in ollamac.list()["models"]]
            for model_type in ["llm", "vlm"]:
                model_name = conf.ollama.model.get(model_type)
                # since the available model name can start with "custom-" we cannot simply use `model_name in available_models`...
                is_available = False
                for available_model in available_models:
                    if model_name in available_model:
                        is_available = True
                        break
                if not is_available:
                    raise RuntimeError(
                        f"{model_type.capitalize()} Model {model_name} is not available. Available models are: {available_models}"
                    )
                cls.__model[model_type] = model_name

            cls.__default_vlm_kwargs = {
                "temperature": 0.0,
                "seed": 1337,
                "num_predict": 8192,
                "num_ctx": 16384,  # context window (default of Granite 3.2 Vision)
                "top_p": 0.9,
                "top_k": 40,
                "repetition_penalty": 1.1,
            }

            cls.__vlm_chat_sessions: dict[str, list[dict]] = dict()
            cls.__vlm_chat_session_timestamps: dict[str, float] = dict()
            cls.__max_vlm_chat_sessions = 50
            cls.__max_vlm_chat_session_age = 7 * 24 * 60 * 60  # 7 days

        except Exception as e:
            msg = f"Cannot instantiate OllamaService - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully established connection to Ollama!")

        return super(OllamaService, cls).__new__(cls)

    def llm_chat(
        self, system_prompt: str, user_prompt: str, response_model: Type[T]
    ) -> T:
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
            format=response_model.model_json_schema(),
        )
        if response.message.content is None:
            raise Exception(f"Ollama response is None: {response}")

        return response_model.model_validate_json(response.message.content)

    def _start_vlm_chat_session(self) -> str:
        session_id = str(uuid4())
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
            gen_kwargs = self.__default_vlm_kwargs

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
