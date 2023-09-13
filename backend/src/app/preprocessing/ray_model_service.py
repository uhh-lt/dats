from typing import Any, Dict

import requests
from app.preprocessing.ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger
from requests import Response


class RayModelService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.base_url = (
            f"{conf.ray_model_worker.protocol}://"
            f"{conf.ray_model_worker.host}:"
            f"{conf.ray_model_worker.port}"
        )
        logger.info(f"RayModelService base_url: {cls.base_url}")

        return super(RayModelService, cls).__new__(cls)

    def _make_post_request(self, endpoint: str, data: Dict[str, Any]) -> Response:
        url = f"{self.base_url}{endpoint}"
        response = requests.post(url, json=data)
        if not response.status_code == 200:
            msg = (
                f"Request to {url} failed with "
                f"status code {response.status_code}!\n"
                f"Response: {response.text}!"
            )
            logger.error(msg)
            raise Exception(msg)
        return response

    def spacy_pipline(self, input: SpacyInput) -> SpacyPipelineOutput:
        response = self._make_post_request("/spacy/pipeline", input.dict())
        return SpacyPipelineOutput.parse_obj(response.json())
