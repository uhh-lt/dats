from typing import Type, TypeVar

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

    def vlm_chat(
        self,
        system_prompt: str,
        user_prompt: str,
        b64_images: list[str],
        response_model: Type[T] | None = None,
    ) -> T | str:
        response_model_schema = None
        if response_model is not None:
            response_model_schema = response_model.model_json_schema()
        response = self.__client.chat(
            model=self.__model["vlm"],
            messages=[
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                },
                {
                    "role": "user",
                    "content": user_prompt.strip(),
                    "images": b64_images,
                },
            ],
            format=response_model_schema,
        )
        if response.message.content is None:
            raise Exception(f"Ollama response is None: {response}")
        if response_model is None:
            return response.message.content
        return response_model.model_validate_json(response.message.content)
