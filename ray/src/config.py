import logging
from typing import TypedDict

from omegaconf import DictConfig, OmegaConf

logger = logging.getLogger("ray.serve")

# global config
__conf_file__ = "../configs/ray_config.yaml"
conf = OmegaConf.load(__conf_file__)

logger.info(f"Loaded config '{__conf_file__}'")


class RayModelDeploymentConfig(TypedDict):
    max_ongoing_requests: int
    ray_actor_options: dict
    autoscaling_config: dict


def build_ray_model_deployment_config(name: str) -> RayModelDeploymentConfig:
    assert isinstance(conf, DictConfig), f"Invalid Ray Config format ({__conf_file__})"
    cc = conf.get(name, None)
    if cc is None:
        raise KeyError(f"Cannot access {name} in {__conf_file__}")

    dep_cc = cc.get("deployment", None)
    if dep_cc is None:
        raise KeyError(f"Cannot access {name}.deployment in {__conf_file__}")

    model_cc = dep_cc.get("model_worker", None)
    if model_cc is None:
        raise KeyError(
            f"Cannot access {name}.deployment.model_worker in {__conf_file__}"
        )

    return {
        "max_ongoing_requests": int(model_cc.max_ongoing_requests),
        "ray_actor_options": dict(model_cc.ray_actor_options),
        "autoscaling_config": dict(model_cc.autoscaling_config),
    }


class RayAPIDeploymentConfig(TypedDict):
    name: str
    num_replicas: int
    max_ongoing_requests: int


def build_ray_api_deployment_config(name: str) -> RayAPIDeploymentConfig:
    assert isinstance(conf, DictConfig), f"Invalid Ray Config format ({__conf_file__})"
    cc = conf.get(name, None)
    if cc is None:
        raise KeyError(f"Cannot access {name} in {__conf_file__}")

    dep_cc = cc.get("deployment", None)
    if dep_cc is None:
        raise KeyError(f"Cannot access {name}.deployment in {__conf_file__}")

    api_cc = dep_cc.get("api", None)
    if api_cc is None:
        raise KeyError(f"Cannot access {name}.deployment.api in {__conf_file__}")

    return {
        "name": str(api_cc.name),
        "num_replicas": int(api_cc.num_replicas),
        "max_ongoing_requests": int(api_cc.max_ongoing_requests),
    }
