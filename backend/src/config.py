import os
import sys
from pathlib import Path

from loguru import logger
from omegaconf import OmegaConf

# global config
backend_mode = os.getenv("DATS_BACKEND_MODE", None)

if backend_mode not in {"production", "development", "test"}:
    raise Exception(
        "No backend mode specified! Please set the DATS_BACKEND_MODE environment variable to either 'production', 'development', or 'test'."
    )

config_dir = Path(__file__).resolve().parents[1] / "configs"

conf = OmegaConf.merge(
    OmegaConf.load(str(config_dir / "base.yaml")),
    OmegaConf.load(str(config_dir / f"{backend_mode}.yaml")),
)

filesystem_root = Path(conf.filesystem.root_directory)
if not filesystem_root.is_absolute():
    project_root = Path(__file__).resolve().parents[2]
    conf.filesystem.root_directory = str((project_root / filesystem_root).resolve())

version_conf = OmegaConf.load(str(config_dir / "version.yaml"))
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
        raise Exception("JWT Secret not set! Please provide a valid JWT Secret.")

    filesystem_root = conf.filesystem.root_directory
    if not filesystem_root or filesystem_root == "":
        raise Exception(
            "Filesystem root not set! Please provide a valid filesystem directory."
        )
