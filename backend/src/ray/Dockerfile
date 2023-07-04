FROM rayproject/ray:latest-py39-gpu as ray


CMD ["/bin/bash"]

RUN sudo apt-get update -q && sudo apt-get install -q -y --no-install-recommends\
    ffmpeg

RUN pip install git+https://github.com/linto-ai/whisper-timestamped python-multipart transformers spacy

RUN python3 -m spacy download en_core_web_sm
