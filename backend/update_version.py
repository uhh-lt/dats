import argparse

from omegaconf import OmegaConf

parser = argparse.ArgumentParser(description="DATS release script")
parser.add_argument(
    "--version",
    type=str,
    help="New version to release",
    required=True,
    dest="version",
)
args = parser.parse_args()

# Update config file
version_conf = OmegaConf.load("./src/configs/version.yaml")
version_conf.api.version = args.version
OmegaConf.save(version_conf, "./src/configs/version.yaml")

# Update pyproject.toml
with open("./pyproject.toml", "r") as f:
    pyproject = f.readlines()
for i, line in enumerate(pyproject):
    if line.startswith("version = "):
        pyproject[i] = f'version = "{args.version}"\n'
        break
with open("./pyproject.toml", "w") as f:
    f.writelines(pyproject)

# Update uv.lock
with open("./uv.lock", "r") as f:
    uv_lock = f.readlines()
previous_line = ""
for i, line in enumerate(uv_lock):
    if previous_line.startswith('name = "dats-backend"') and line.startswith(
        "version = "
    ):
        uv_lock[i] = f'version = "{args.version}"\n'
        break
    previous_line = line
with open("./uv.lock", "w") as f:
    f.writelines(uv_lock)
