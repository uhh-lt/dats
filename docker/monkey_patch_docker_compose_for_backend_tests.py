# This script drops the deploy section from the docker compose file since it is
# not supported by the docker compose version available in GH Actions environment
import sys

import yaml

with open("../docker/docker-compose.yml") as f:
    file = f.read()

data = yaml.safe_load(file)

disable_ray = len(sys.argv) > 1 and sys.argv[1] == "--disable_ray"
disable_ollama = len(sys.argv) > 2 and sys.argv[2] == "--disable_ollama"

if disable_ray:
    # remove ray as it's too resource-intensive for CI
    data["services"].pop("ray", None)

if disable_ollama:
    # remove ollama as it's too resource-intensive for CI
    data["services"]["celery-background-jobs-worker"]["networks"].remove(
        "ollama_network"
    )
    data["services"]["dats-backend-api"]["networks"].remove("ollama_network")
    data["networks"].pop("ollama_network", None)

for a in data["services"]:
    data["services"][a].pop("deploy", None)

with open("compose-test.yml", "w") as f:
    yaml.dump(data, f)
