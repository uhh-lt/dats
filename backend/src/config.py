import sys
from pathlib import Path

from loguru import logger
from omegaconf import OmegaConf

from config_schema import BackendConfigSchema

config_dir = Path(__file__).resolve().parents[1] / "configs"

conf = OmegaConf.merge(
    OmegaConf.load(str(config_dir / "base.yaml")),
    OmegaConf.load(str(config_dir / "default.yaml")),
)

filesystem_root = Path(conf.filesystem.root_directory)
if not filesystem_root.is_absolute():
    project_root = Path(__file__).resolve().parents[2]
    conf.filesystem.root_directory = str((project_root / filesystem_root).resolve())

version_conf = OmegaConf.load(str(config_dir / "version.yaml"))
conf = OmegaConf.merge(conf, version_conf)
conf = BackendConfigSchema.model_validate(OmegaConf.to_container(conf, resolve=True))

# setup loguru logging
logger.remove()
logger.add(sys.stderr, level=conf.logging.level.upper())
logger.info("Loaded config 'default.yaml'")
