import argparse

from omegaconf import OmegaConf

version_conf = OmegaConf.load("./src/configs/version.yaml")

parser = argparse.ArgumentParser(description="DATS release script")
parser.add_argument(
    "--version",
    type=str,
    help="New version to release",
    required=True,
    dest="version",
)
args = parser.parse_args()

version_conf.api.version = args.version

OmegaConf.save(version_conf, "./src/configs/version.yaml")
