# docker build -f Dockerfile -t uhhlt/dats_backend:<version> .
# docker push uhhlt/dats_backend:<version>

FROM ubuntu:jammy-20250404 AS ubuntu

# install uv, pinned: a new `latest` would invalidate the cached layers below
# and rebuild the whole virtual environment on every uv release
COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /uvx /bin/

CMD ["/bin/bash"]

# install basic Ubuntu packages including python3.11
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update && apt-get install -y software-properties-common && add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update -q && \
    apt-get install -q -y --no-install-recommends bzip2 curl wget ca-certificates libmagic1 libpq-dev build-essential python3.11 python3.11-dev python3-pip python3-dev ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -r /var/cache

# create the python environment
ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1
ENV UV_LOCKED=1

WORKDIR /dats/backend
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --directory . --no-dev --no-editable --no-install-project --no-install-workspace --no-managed-python
ENV PATH="/dats/backend/.venv/bin:${PATH}"

# set up python env variables
ENV PYTHONFAULTHANDLER=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONHASHSEED=random
ENV PYTHONDONTWRITEBYTECODE=1
ENV CUPY_CACHE_IN_MEMORY=1
ENV PYTHONPATH=/dats/backend/src

# copy the actual dats source code into the image
COPY . /dats/backend
WORKDIR /dats/backend
