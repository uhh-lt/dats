# D-WISE Tool Suite -- Backend

This is the repository for the D-WISE Tool Suite (DWTS) Backend - an outcome of
the [D-WISE Project](https://www.dwise.uni-hamburg.de/)

## Run with `docker-compose` _(recommended)_
1) make sure to configure the exposed ports and other variables in the `docker-compose.yml` or `.env` file!
2) check on which ports the services are available
3) run `docker-compose up -d`
4) access the web interface of the services in the browser



## Run locally _(not recommended)_

### 1) install python requirements 

```shell
poetry install && poetry run pip install -U pip && poetry run python -m spacy download "en_core_web_trf"
```

### 2) run 3rd party services with docker-compose

```docker
docker-compose -f services_docker-compose.yml up -d
```

### 3) start celery worker

```shell
PYTHONPATH=src celery -A app.docprepro.process worker -l DEBUG -c 1
```

### 4) start the backend

```shell
PYTHONPATH=src DWISE_BACKEND_CONFIG=src/configs/default_localhost_dev.yaml python src/main.py
```