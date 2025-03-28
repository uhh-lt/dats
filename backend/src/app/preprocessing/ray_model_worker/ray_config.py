import logging
import os
from typing import Dict, TypedDict

from omegaconf import DictConfig, OmegaConf

logger = logging.getLogger("ray.serve")

# global config
__conf_file__ = os.getenv("RAY_CONFIG", None)
assert __conf_file__ is not None, "RAY_CONFIG is not set"
conf = OmegaConf.load(__conf_file__)

logger.info(f"Loaded config '{__conf_file__}'")


class RayDeploymentConfig(TypedDict):
    ray_actor_options: Dict
    autoscaling_config: Dict


def build_ray_model_deployment_config(name: str) -> RayDeploymentConfig:
    assert isinstance(conf, DictConfig), f"Invalid Ray Config format ({__conf_file__})"
    cc = conf.get(name, None)
    if cc is None:
        raise KeyError(f"Cannot access {name} in {__conf_file__}")

    dep_cc = cc.get("deployment", None)
    if dep_cc is None:
        raise KeyError(f"Cannot access {name}.deployment in {__conf_file__}")

    return {
        "ray_actor_options": dict(cc.deployment.ray_actor_options),
        "autoscaling_config": dict(cc.deployment.autoscaling_config),
    }
