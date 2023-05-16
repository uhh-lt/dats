#!/bin/bash

SERVER=ltdwise

# Remote Ports


DWTS_API_PORT=18120
DWTS_POSTGRES_PORT=18121
DWTS_CONTENT_PORT=18134

open_ssh_tunnels_dwts_backend() {
  echo "Opening SSH tunnel (backend api): localhost:5500 -> $SERVER:$DWTS_API_PORT"
  ssh -L "5500:127.0.0.1:$DWTS_API_PORT" -f -N $SERVER

  echo "Opening SSH tunnel (postgres): localhost:5432 -> $SERVER:$DWTS_POSTGRES_PORT"
  ssh -L "5432:127.0.0.1:$DWTS_POSTGRES_PORT" -f -N $SERVER

  echo "Opening SSH tunnel (backend content): localhost:14144 -> $SERVER:$DWTS_CONTENT_PORT"
  ssh -L "14144:127.0.0.1:$DWTS_CONTENT_PORT" -f -N $SERVER
}


kill_ssh_pipes() {
  declare -a arr=("5500" "5432" "14144")

  for i in "${arr[@]}"; do
    echo "Closing SSH tunnel from $SERVER:$i ..."
    for pid in $(pgrep -f -a "ssh -L $i"); do
      kill "$pid"
    done
  done
}

PS3="open or close the tunnels? "
select method in dwts_backend kill; do
  case $method in
  dwts_backend)
    open_ssh_tunnels_dwts_backend
    break
    ;;
  kill)
    kill_ssh_pipes
    break
    ;;
  *)
    echo "Invalid option $REPLY"
    ;;
  esac
  echo
done
echo
