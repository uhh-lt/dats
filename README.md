# D-WISE Tool Suite -- Backend

This is the repository for the D-WISE Tool Suite (DWTS) Backend - an outcome of
the [D-WISE Project](https://www.dwise.uni-hamburg.de/)

### install requirements

#### pip

```shell
pip install -r requirements.txt
```

#### conda

```shell
pip install -r requirements.txt
```

### How to run

1) run PostgresSQL with docker

```docker
docker run -d -p 5432:5432 \ 
              -v postgres-volume:/var/lib/postgresql/data \
              -e POSTGRES_PASSWORD=rootpwd \ 
              -e POSTGRES_USER=root postgres
```

3) run main.py

```shell
PYTHONPATH=src DWISE_BACKEND_CONFIG=src/configs/default_localhost_dev.yaml python src/main.py
```