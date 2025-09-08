# docker build -t uhhlt/dats_ray:<version> .
# docker push uhhlt/dats_ray:<version>

FROM nvidia/cuda:12.5.0-devel-ubuntu22.04 AS ubuntu

WORKDIR /ray_code

# Install cuDNN for CUDA 12.x
RUN apt-get update && \
    apt-get install -y --no-install-recommends libcudnn9-cuda-12 libcudnn9-dev-cuda-12

# install python3.11
RUN apt-get update -q && \
    apt-get install -q -y --no-install-recommends python3.11 python3.11-dev python3-pip python3-dev

# install ubuntu packages
RUN apt-get update -q && \
    apt-get install -q -y --no-install-recommends ffmpeg curl ca-certificates

# clean up apt cache
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -r /var/cache

# install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# install dependencies
ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1
ENV UV_LOCKED=1
COPY pyproject.toml uv.lock /ray_code/
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --directory . --no-dev --no-editable --no-install-project --no-install-workspace --no-managed-python
ENV PATH="/ray_code/.venv/bin:${PATH}"

# makes CUDA devices visible to the container by default
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Set timezone
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# set up python env variables
ENV PYTHONFAULTHANDLER=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONHASHSEED=random
ENV PYTHONDONTWRITEBYTECODE=1
ENV CUPY_CACHE_IN_MEMORY=1
ENV PYTHONPATH=/ray_code/src

# copy ray source code into the image
COPY . .
