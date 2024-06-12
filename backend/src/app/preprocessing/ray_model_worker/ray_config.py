import logging
import os
from typing import Any, Dict

from omegaconf import DictConfig, OmegaConf

logger = logging.getLogger("ray.serve")

# global config
__conf_file__ = os.getenv("RAY_CONFIG", "./config.yaml")
conf = OmegaConf.load(__conf_file__)
assert type(conf) == DictConfig

logger.info(f"Loaded config '{__conf_file__}'")


def build_ray_model_deployment_config(name: str) -> Dict[str, Dict[str, Any]]:
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
