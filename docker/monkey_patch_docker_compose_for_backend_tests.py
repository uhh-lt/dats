# This script drops the deploy section from the docker compose file since it is
# not supported by the docker compose version available in GH Actions environment
import yaml

with open("docker-compose.yml") as f:
    file = f.read()


data = yaml.safe_load(file)
for a in data["services"]:
    data["services"][a].pop("deploy", None)

with open("compose-test.yml", "w") as f:
    dumpy = yaml.dump(data, f)
    f.write = dumpy
