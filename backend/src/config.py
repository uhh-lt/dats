import os
import sys

from loguru import logger
from omegaconf import OmegaConf

# global config
backend_mode = os.getenv("DATS_BACKEND_MODE", None)

if backend_mode != "production" and backend_mode != "development":
    raise Exception(
        "No backend mode specified! Please set the DATS_BACKEND_MODE environment variable to either 'production' or 'development'."
    )

conf = OmegaConf.load(
    os.path.join(os.path.dirname(__file__), f"../configs/{backend_mode}.yaml")
)
version_conf = OmegaConf.load(
    os.path.join(os.path.dirname(__file__), "../configs/version.yaml")
)
conf = OmegaConf.merge(conf, version_conf)

# setup loguru logging
logger.remove()
logger.add(sys.stderr, level=conf.logging.level.upper())

# disabled to not write into containers, you might want to uncomment this for development
# logger.add(str(Path(conf.filesystem.root_directory).joinpath("logs/{time}.log")),
#            rotation=f"{conf.logging.max_file_size} MB",
#            level=conf.logging.level.upper())

logger.info(f"Loaded config '{backend_mode}.yaml'")


def verify_config():
    jwt_secret = conf.api.auth.jwt.secret
    if not jwt_secret or jwt_secret == "":
        raise Exception(
            "JWT Secret not set! Please provide a valid JWT Secret using the JWT_SECRET environment variable."
        )

    filesystem_root = conf.filesystem.root_directory
    if not filesystem_root or filesystem_root == "":
        raise Exception(
            "FILESYSTEM_ROOT not set! Please provide a valid filesystem directory using the FILESYSTEM_ROOT environment variable."
        )
