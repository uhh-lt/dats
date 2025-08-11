#!/bin/bash

if [[ -z "${DOCKER_UID}" ]]; then
	echo
	echo -e "\033[1;33mWARNING!!!: DOCKER_UID not set!\e[0m"
	echo "If you are on Linux, you SHOULD follow the instructions below to set "
	echo "DOCKER_UID environment variable, otherwise files will be owned by root."
	echo "For other operating systems you can get rid of the warning with manually created .env file:"
	echo "    See: https://airflow.apache.org/docs/apache-airflow/stable/howto/docker-compose/index.html#setting-the-right-airflow-user"
	echo
	export DOCKER_UID=$(id -u)
fi
one_meg=1048576
mem_available=$(($(getconf _PHYS_PAGES) * $(getconf PAGE_SIZE) / one_meg))
cpus_available=$(grep -cE 'cpu[0-9]+' /proc/stat)
disk_available=$(df / | tail -1 | awk '{print $4}')
warning_resources="false"
if ((mem_available < 4000)); then
	echo
	echo -e "\033[1;33mWARNING!!!: Not enough memory available for Docker.\e[0m"
	echo "At least 4GB of memory required. You have $(numfmt --to iec $((mem_available * one_meg)))"
	echo
	warning_resources="true"
fi
if ((cpus_available < 2)); then
	echo
	echo -e "\033[1;33mWARNING!!!: Not enough CPUS available for Docker.\e[0m"
	echo "At least 2 CPUs recommended. You have ${cpus_available}"
	echo
	warning_resources="true"
fi
if ((disk_available < one_meg * 10)); then
	echo
	echo -e "\033[1;33mWARNING!!!: Not enough Disk space available for Docker.\e[0m"
	echo "At least 10 GBs recommended. You have $(numfmt --to iec $((disk_available * 1024)))"
	echo
	warning_resources="true"
fi
if [[ ${warning_resources} == "true" ]]; then
	echo
	echo -e "\033[1;33mWARNING!!!: You have not enough resources to run Airflow (see above)!\e[0m"
	echo "Please follow the instructions to increase amount of resources available:"
	echo "   https://airflow.apache.org/docs/apache-airflow/stable/howto/docker-compose/index.html#before-you-begin"
	echo
fi
echo
echo "Creating missing opt dirs if missing:"
echo
mkdir -v -p /opt/airflow/{logs,dags,plugins,config}
echo
echo "Airflow version:"
/entrypoint airflow version
echo
echo "Files in shared volumes:"
echo
ls -la /opt/airflow/{logs,dags,plugins,config}
echo
echo "Running airflow config list to create default config file if missing."
echo
/entrypoint airflow config list >/dev/null
echo
echo "Files in shared volumes:"
echo
ls -la /opt/airflow/{logs,dags,plugins,config}
echo
echo "Change ownership of files in /opt/airflow to ${DOCKER_UID}:0"
echo
chown -R "${DOCKER_UID}:0" /opt/airflow/
echo
echo "Change ownership of files in shared volumes to ${DOCKER_UID}:0"
echo
chown -v -R "${DOCKER_UID}:0" /opt/airflow/{logs,dags,plugins,config}
echo
echo "Files in shared volumes:"
echo
ls -la /opt/airflow/{logs,dags,plugins,config}
