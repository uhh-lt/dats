#!/bin/bash
cd /dwts_code/src/ray/

serve run jobs:deploy -h 0.0.0.0 
# ray start --head
# serve run config.yaml
# serve build jobs:whisper_deploy -o config.yaml
# sleep infinity

