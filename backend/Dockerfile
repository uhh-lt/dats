FROM ubuntu:jammy-20221020 as ubuntu
CMD ["/bin/bash"]

# makes CUDA devices visible to the container by default
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# install basic tools to download files/models & java for apache tika
RUN apt-get update -q &&\
    apt-get install -q -y --no-install-recommends bzip2 curl wget openjdk-8-jre-headless &&\
    apt-get clean &&\
    rm -rf /var/lib/apt/lists/* &&\
    rm -r /var/cache

# download tika for use with python-tika
ARG TIKA_VERSION=1.28.5
ENV TIKA_VERSION=${TIKA_VERSION}
ENV TIKA_SERVER_JAR=file:///opt/tika.jar
ENV TIKA_LOG_FILE=''
ENV TIKA_PATH=/tika
RUN wget https://repo1.maven.org/maven2/org/apache/tika/tika-server/${TIKA_VERSION}/tika-server-${TIKA_VERSION}.jar -O /opt/tika.jar -q &&\
    wget https://repo1.maven.org/maven2/org/apache/tika/tika-server/${TIKA_VERSION}/tika-server-${TIKA_VERSION}.jar.md5 -O /opt/tika.jar.md5 -q

# install micromamba for anaconda python package management
ARG MICROMAMBA_VERSION=0.27.0
RUN wget -q https://micro.mamba.pm/api/micromamba/linux-64/${MICROMAMBA_VERSION} -O mamba.tar.bz2 && tar -xvj -f mamba.tar.bz2 bin/micromamba && rm mamba.tar.bz2

# create the 'dwts' python environment with all dependencies
ENV MAMBA_ROOT_PREFIX=/opt
COPY environment.yml .
RUN micromamba create -f environment.yml -q -y &&\
    micromamba clean -a -f -q -y &&\
    find /opt/ -follow -type f -name '*.a' -delete &&\
    find /opt/ -follow -type f -name '*.js.map' -delete &&\
    rm -r /root/.cache


# These settings & scripts are needed to automatically start any CMD in the container with the python environment
ENV MAMBA_EXE="/bin/micromamba"
ENV ENV_NAME=dwts
ARG MAMBA_DOCKERFILE_ACTIVATE=1
COPY _entrypoint.sh /usr/local/bin/_entrypoint.sh
COPY _activate_current_env.sh /usr/local/bin/_activate_current_env.sh
COPY _dockerfile_shell.sh /usr/local/bin/_dockerfile_shell.sh
ENTRYPOINT ["/usr/local/bin/_entrypoint.sh"]
SHELL ["/usr/local/bin/_dockerfile_shell.sh"]



# set up python env variables
ARG DWTS_ENV
ENV DWTS_ENV=${DWTS_ENV} \
    PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PYTHONDONTWRITEBYTECODE=1 \
    CUPY_CACHE_IN_MEMORY=1

# allow running celery workers as superuser
ENV C_FORCE_ROOT=1

# For development, Jupyter remote kernel
# Using inside the container:
# jupyter lab --ip=0.0.0.0 --allow-root --NotebookApp.custom_display_url=http://127.0.0.1:8888
ARG INSTALL_JUPYTER=false
RUN bash -c "if [ $INSTALL_JUPYTER == 'true' ] ; then micromamba install jupyterlab -c conda-forge -q -y -n dwts && micromamba clean -a -f -q -y ; fi"

# copy the actual DWTS source code into the image
WORKDIR /dwts_code
COPY . /dwts_code
WORKDIR /dwts_code/src
