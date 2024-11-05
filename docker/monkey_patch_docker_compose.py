# This script drops the deploy section from the docker compose file since it is
# not supported by the docker compose version available in GH Actions environment
import sys

import yaml

with open("../docker/docker-compose.yml") as f:
    file = f.read()

data = yaml.safe_load(file)

disable_ray = False
disable_ollama = False
for arg in sys.argv:
    if arg == "--disable_ray":
        disable_ray = True
    if arg == "--disable_ollama":
        disable_ollama = True

if disable_ray:
    # remove ray service
    data["services"].pop("ray", None)
    for s in data["services"]:
        # remove ray from depends_on
        depends_on = data["services"][s].get("depends_on", None)
        if depends_on and "ray" in depends_on:
            del depends_on["ray"]
            data["services"][s]["depends_on"] = depends_on

        # set env variable RAY_ENABLED to False
        environment = data["services"][s].get("environment", {})
        if "RAY_ENABLED" in environment:
            environment["RAY_ENABLED"] = False
        data["services"][s]["environment"] = environment

if disable_ollama:
    # remove ollama_network
    data["services"]["celery-background-jobs-worker"]["networks"].remove(
        "ollama_network"
    )
    data["services"]["dats-backend-api"]["networks"].remove("ollama_network")
    data["networks"].pop("ollama_network", None)
    # set env variable OLLAMA_ENABLED to False
    for s in data["services"]:
        environment = data["services"][s].get("environment", {})
        if "OLLAMA_ENABLED" in environment:
            environment["OLLAMA_ENABLED"] = False
        data["services"][s]["environment"] = environment

# remove services not used for testing
data["services"].pop("kibana", None)
data["services"].pop("lighttpd", None)

# remove gpu configs
for s in data["services"]:
    data["services"][s].pop("deploy", None)

with open("docker-compose-patched.yml", "w") as f:
    yaml.safe_dump(data, f)
