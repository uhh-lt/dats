# Configure GitHub Action Runners

DATS uses **self-hosted GitHub Action runners** to run its CI checks (backend tests, frontend checks, Ray builds, and more). This guide explains how to set up one or more runners on a single machine so they can execute jobs **concurrently without conflicting** with each other.

## Why isolation matters

Each CI job spins up a full DATS stack using Docker Compose: PostgreSQL, Redis, Elasticsearch, Weaviate, the backend API, the frontend, and optionally Ray. By default, every run would try to use the **same ports**, the **same Docker Compose project name** (and thus the same containers, networks, and volumes), and the **same GPU**.

If two runners shared these, one run's `docker compose up` would hijack the other run's containers, and one run's cleanup (`docker compose down -v`) would tear down the other run's stack mid-test. To prevent this, every runner gets its own isolated identity.

## How isolation works

Isolation is derived entirely from the **runner's name**, which you choose when registering the runner. The convention is:

```
dats-runner-01
dats-runner-02
dats-runner-03
...
```

The last **two digits** of the runner name drive everything:

| Runner name      | Port prefix | Compose project                | Example API port |
| ---------------- | ----------- | ------------------------------ | ---------------- |
| `dats-runner-01` | `501`       | `action-runner-dats-runner-01` | `50120`          |
| `dats-runner-02` | `502`       | `action-runner-dats-runner-02` | `50220`          |
| `dats-runner-99` | `599`       | `action-runner-dats-runner-99` | `59920`          |

The CI's `prepare-env` step extracts the two digits, builds the port prefix as `5<digits>`, and passes it to `bin/setup/setup-envs.sh`, which rewrites every port in the generated `.env` files. It also suffixes the Compose project name with the runner name, which isolates:

- **Ports** — each runner binds a distinct `5xx xx` range (e.g. API on `50120` vs `50220`).
- **Containers & networks** — named `<project>-<service>` and `<project>_dats_network`, so no cross-runner adoption.
- **Named volumes** — `<project>_postgres_data` etc., so one runner's `down -v` never deletes another's data.

Docker image tags are already unique per _run_ (suffixed with the GitHub `run_id`), so concurrent builds never overwrite each other's images.

## Setting up a runner

### 1. Register the runner with a two-digit suffix

In your GitHub repository or organization, go to **Settings → Actions → Runners → New self-hosted runner** and follow the instructions. When you run the configuration script, set the name explicitly:

```bash
./config.sh --url https://github.com/uhh-lt/dats --name dats-runner-01
```

For each additional runner on the same machine, increment the number (`dats-runner-02`, `dats-runner-03`, …). Each runner must live in its **own directory** (GitHub runners use separate work folders by default, which keeps checkouts isolated).

!!! warning
The name **must end in exactly two digits**. The CI's `prepare-env` step fails with a clear error if it can't extract them.

### 2. Install dependencies

Each runner needs the tools the workflows invoke:

- **Docker** (with the Compose plugin) and permission to run it without `sudo`
- **just** — the command runner used for all dev/CI commands
- **uv** — the Python package manager
- **Node.js** (for frontend checks)
- **pwgen** (used by `setup-envs.sh` to generate secrets)

### 3. Run the runner

```bash
./run.sh
```

Or install it as a service so it starts on boot:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

## Shared resources (intentionally not isolated)

A few resources are deliberately shared across all runners on the machine:

- **Ray cache** (`$HOME/ray_cache`) — model downloads are cached machine-wide to avoid re-downloading large models for every runner. Concurrent access is tolerable for a cache.
- **GPU** — Ray jobs pin `RAY_DEVICE_IDS=1`. This means only one Ray-enabled job should run at a time per machine; running two concurrently will contend for the same GPU. If you need parallel Ray jobs, assign different GPUs per runner.
- **Hosted services** — LLM, embedding, and Docling endpoints point at shared hosted infrastructure (`ltdwise.informatik.uni-hamburg.de`), which is stateless and safe to share.

## Troubleshooting

**Job fails with "must end in two digits"**
The runner name doesn't match the convention. Re-register or rename it to end in two digits (e.g. `dats-runner-01`).

**"Port is already allocated"**
Two runners are using the same port prefix. Ensure each runner has a unique two-digit suffix.

**One run's tests fail when another run starts**
This should not happen with per-runner Compose projects. Confirm the runners have distinct names and that `COMPOSE_PROJECT_NAME` differs between their generated `docker/.env` files.
