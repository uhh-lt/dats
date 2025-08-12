# MUST BE RUN FROM root directory!
# docker build -f airflow/Dockerfile -t uhhlt/dats_airflow:<version> .
# docker push uhhlt/dats_airflow:<version>

FROM apache/airflow:3.0.3-python3.11

# install basic packages
USER root
RUN apt-get update && apt-get install -y software-properties-common
RUN apt-get update -q && \
    apt-get install -q -y --no-install-recommends bzip2 curl wget ca-certificates libmagic1 libpq-dev build-essential ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -r /var/cache

# set timezone
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

USER airflow

# create the dats python environment
ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1
ENV UV_LOCKED=1

WORKDIR /dats_code
RUN uv venv /dats_code/dats-venv
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    source /dats_code/dats-venv/bin/activate && uv sync --active --directory . --no-dev --no-editable --no-install-project --no-install-workspace --no-managed-python

# set up python env variables
ENV PYTHONFAULTHANDLER=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONHASHSEED=random
ENV PYTHONDONTWRITEBYTECODE=1
ENV CUPY_CACHE_IN_MEMORY=1
ENV PYTHONPATH=/dats_code/src

# copy the dats source code into the image
COPY backend/src /dats_code

# copy the dags source code into the image
COPY airflow/src/dags /opt/airflow/dags

WORKDIR /dats_code
