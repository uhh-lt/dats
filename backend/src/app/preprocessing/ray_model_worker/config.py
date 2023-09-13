import logging
import os

from omegaconf import OmegaConf

logger = logging.getLogger("ray.serve")

# global config
__conf_file__ = os.getenv("RAY_CONFIG", "./config.yaml")
conf = OmegaConf.load(__conf_file__)


# disabled to not write into containers, you might want to uncomment this for development
# logger.add(str(Path(conf.repo.root_directory).joinpath("logs/{time}.log")),
#            rotation=f"{conf.logging.max_file_size} MB",
#            level=conf.logging.level.upper())

logger.info(f"Loaded config '{__conf_file__}'")
