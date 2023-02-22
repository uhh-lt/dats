import os
import sys
from pathlib import Path

from loguru import logger
from omegaconf import OmegaConf

# global config
__conf_file__ = os.getenv("DWISE_BACKEND_CONFIG", "./configs/default_localhost_dev.yaml")
conf = OmegaConf.load(__conf_file__)

# setup loguru logging
logger.remove()
logger.add(sys.stderr, level=conf.logging.level.upper())

# disabled to not write into containers, you might want to uncomment this for development
# logger.add(str(Path(conf.repo.root_directory).joinpath("logs/{time}.log")),
#            rotation=f"{conf.logging.max_file_size} MB",
#            level=conf.logging.level.upper())

logger.info(f"Loaded config '{__conf_file__}'")