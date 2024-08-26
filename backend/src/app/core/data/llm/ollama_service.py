from loguru import logger
from ollama import Client

from app.util.singleton_meta import SingletonMeta
from config import conf


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

            # ensure that the configured model is available
            model = conf.ollama.model
            available_models = [x["name"] for x in ollamac.list()["models"]]
            if model not in available_models:
                print(f"Model {model} is not available. Pulling it now.")
                ollamac.pull(model)
                print(f"Model {model} has been pulled successfully.")
            available_models = [x["name"] for x in ollamac.list()["models"]]
            assert (
                model in available_models
            ), f"Model {model} is not available. Available models are: {available_models}"

            cls.__model = model
            cls.__client = ollamac

        except Exception as e:
            msg = f"Cannot instantiate OllamaService - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully established connection to Ollama!")

        return super(OllamaService, cls).__new__(cls)

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        response = self.__client.chat(
            model=self.__model,
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
        )
        return response["message"]["content"].strip()
