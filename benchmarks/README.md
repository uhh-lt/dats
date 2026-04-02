# LLM Benchmarking Framework

This folder contains a modular and reproducible framework for benchmarking LLMs across NLP tasks.

## First Working Experiment

The first implemented end-to-end experiment is document classification on a sampled 20 Newsgroups split.

Configuration rules:

- Experiment and backend configs are composed via Hydra groups into typed `RunConfig` as `experiment` and `backend`.
- Model config is nested in each experiment via `defaults` (`/model: ...`) as `experiment.model`.
- Dataset config is nested in each experiment via `defaults` (`/dataset: ...`) as `experiment.dataset`.
- Dataset configs define `name`, `path`, `text_column`, and `label_column`.
- `run_name` in experiment configs is optional. If omitted, MLflow auto-generates it.
- Prompt templates are always loaded from `src/prompts/templates` (not configurable).
- Schema is configured as a single dotted path (for example `newsgroups20_schema.NewsgroupClassificationSchemaV1`).

### 1. Install dependencies

```bash
cd benchmarks
uv sync
```

### 2. Prepare data

```bash
uv run python data/20newsgroups/preprocess.py
```

### 3. Start MLflow service

```bash
cd docker
cp .env.example .env
docker compose up -d
cd ..
```

### 4. Run the 20 Newsgroups experiment

```bash
uv run python src/run_experiment.py
```

### 5. Override config groups (example)

```bash
uv run python src/run_experiment.py \
	experiment=20newsgroups_v1_zeroshot \
	backend=vllm \
	backend.gpu_id=1
```

## Layout

- `configs/`: Runtime config and Hydra groups (`experiment/`, `model/`, `dataset/`, `backend/`)
- `data/`: Datasets and preprocessing scripts
- `docker/`: MLflow compose files and environment templates
- `outputs/`: Local output artifacts (CSV/JSON)
- `src/`: Core runner, LLM clients, schemas, prompts, evaluation, tracking
