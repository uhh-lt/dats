# docker build -t uhhlt/dats_ray:<version> .
# docker push uhhlt/dats_ray:<version>

FROM rayproject/ray:2.32.0-py311-cu117 AS ray

CMD ["/bin/bash"]

# makes CUDA devices visible to the container by default
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

RUN sudo apt-get update -q && sudo apt-get install -q -y --no-install-recommends\
    ffmpeg curl

# install uv and cache dependencies (this drastically (!) reduces build time)
RUN --mount=type=cache,target=/root/.cache pip install uv

COPY requirements.txt /tmp/requirements.txt

# install and cache dependencies via uv (this drastically (!) reduces build time)
RUN --mount=type=cache,target=/root/.cache uv pip install -r /tmp/requirements.txt --system


# copy source code into the image
WORKDIR /dats_code_ray
COPY . .
