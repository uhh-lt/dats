from typing import Any, Dict, List

import requests
from app.preprocessing.ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger
from requests import Response


class RayModelService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.base_url = f"{conf.ray.protocol}://" f"{conf.ray.host}:" f"{conf.ray.port}"
        logger.info(f"RayModelService base_url: {cls.base_url}")

        try:
            response = requests.get(f"{cls.base_url}/-/routes")
            if not response.status_code == 200:
                msg = (
                    f"Request to {cls.base_url} failed with "
                    f"status code {response.status_code}!\n"
                    f"Response: {response.text}!"
                )
                logger.error(msg)
                raise Exception(msg)
        except Exception as e:
            msg = f"Error while starting the RayModelService! Exception: {str(e)}"
            logger.error(msg)
            raise SystemExit(msg)

        cls.base_routes: List[str] = list(response.json().keys())
        logger.info(
            f"RayModelService detected the following base routes:"
            f"\n{cls.base_routes}"
        )

        return super(RayModelService, cls).__new__(cls)

    def _assert_valid_base_route(self, endpoint: str) -> None:
        for br in self.base_routes:
            if endpoint.startswith(br):
                return
        msg = (
            f"Invalid endpoint '{endpoint}'! "
            f"Must start with one of the following base routes: {self.base_routes}"
        )
        logger.error(msg)
        raise Exception(msg)

    def _make_post_request(self, endpoint: str, data: Dict[str, Any]) -> Response:
        url = f"{self.base_url}{endpoint}"
        logger.debug(f"Making POST request to {url} with data: {data}")
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
