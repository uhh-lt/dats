# This script drops the deploy section from the docker compose file since it is
# not supported by the docker compose version available in GH Actions environment
import sys

import yaml

with open("docker-compose.yml") as f:
    file = f.read()

data = yaml.safe_load(file)

disable_ray = len(sys.argv) > 1 and sys.argv[1] == "--disable_ray"

if disable_ray:
    # remove ray as it's too resource-intensive for CI
    data["services"].pop("ray", None)
    data["services"]["celery-background-jobs-worker"]["links"].remove("ray")
    data["services"]["dats-backend-api"]["depends_on"].remove("ray")
    data["services"]["dats-backend-api"]["links"].remove("ray")

for a in data["services"]:
    data["services"][a].pop("deploy", None)

with open("compose-test.yml", "w") as f:
    dumpy = yaml.dump(data, f)
    f.write = dumpy
