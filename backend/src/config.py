import os
import sys

from loguru import logger
from omegaconf import OmegaConf

# global config
__conf_file__ = os.getenv("DATS_BACKEND_CONFIG", None)

if __conf_file__ is None:
    raise Exception(
        "No config file specified! Please set the DATS_BACKEND_CONFIG environment variable."
    )

conf = OmegaConf.load(__conf_file__)
version_conf = OmegaConf.load("./configs/version.yaml")
conf = OmegaConf.merge(conf, version_conf)

# setup loguru logging
logger.remove()
logger.add(sys.stderr, level=conf.logging.level.upper())

# disabled to not write into containers, you might want to uncomment this for development
# logger.add(str(Path(conf.repo.root_directory).joinpath("logs/{time}.log")),
#            rotation=f"{conf.logging.max_file_size} MB",
#            level=conf.logging.level.upper())

logger.info(f"Loaded config '{__conf_file__}'")


def verify_config():
    jwt_secret = conf.api.auth.jwt.secret
    print(jwt_secret)
    if not jwt_secret or jwt_secret == "":
        raise Exception(
            "JWT Secret not set! Please provide a valid JWT Secret using the JWT_SECRET environment variable."
        )
