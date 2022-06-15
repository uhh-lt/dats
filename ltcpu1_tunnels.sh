#!/bin/bash

open_ssh_tunnels() {
  echo "Opening SSH tunnel from ltcpu1:14140 ..."
  ssh -L "5500:127.0.0.1:14140" -f -N ltcpu1

  echo "Opening SSH tunnel from ltcpu1:14141 ..."
  ssh -L "5432:127.0.0.1:14141" -f -N ltcpu1

  echo "Opening SSH tunnel from ltcpu1:14142 ..."
  ssh -L "5601:127.0.0.1:14142" -f -N ltcpu1

  echo "Opening SSH tunnel from ltcpu1:14143 ..."
  ssh -L "8888:127.0.0.1:14143" -f -N ltcpu1
}

kill_ssh_pipes() {
  declare -a arr=("5500" "5432" "5601" "8888")

  for i in "${arr[@]}"
  do
    echo "Closing SSH tunnel from ltcpu1:$i ..."
    pid=$(pgrep -f -a "ssh -L $i")
    kill "$pid"
  done
}

PS3="open or close the tunnels? "
select method in open kill; do
  case $method in
  open)
    open_ssh_tunnels
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