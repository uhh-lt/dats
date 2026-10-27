# Configure GitHub Action Runners

DATS uses **self-hosted GitHub Action runners** to run its CI checks (backend tests, frontend checks, Ray builds, and more). Runners are deployed as a **dockerized fleet** from the [action-runner/](https://github.com/uhh-lt/dats/tree/main/action-runner) directory: ephemeral Docker containers that auto-register with GitHub, execute jobs, and cleanly deregister themselves on shutdown. This guide explains how to run the fleet on a machine so multiple runners can execute jobs **concurrently without conflicting** with each other.

!!! info
The [action-runner/README.md](https://github.com/uhh-lt/dats/blob/main/action-runner/README.md) is the authoritative reference for the fleet's configuration options and commands. This page focuses on the concepts and the CI isolation contract.

## Why isolation matters

Each CI job spins up a full DATS stack using Docker Compose: PostgreSQL, Redis, Elasticsearch, Weaviate, the backend API, the frontend, and optionally Ray. By default, every run would try to use the **same ports**, the **same Docker Compose project name** (and thus the same containers, networks, and volumes), and the **same GPU**.

If two runners shared these, one run's `docker compose up` would hijack the other run's containers, and one run's cleanup (`docker compose down -v`) would tear down the other run's stack mid-test. To prevent this, every runner gets its own isolated identity.

## How isolation works

Isolation is derived entirely from the **runner's name**. The fleet generates names automatically from the container hostname, using the convention:

```
dats-runner-01
dats-runner-02
dats-runner-03
...
```

The last **two digits** of the runner name drive everything:

| Runner name      | Port prefix | Compose project                | Example API port |
| ---------------- | ----------- | ------------------------------ | ---------------- |
| `dats-runner-01` | `301`       | `action-runner-dats-runner-01` | `30120`          |
| `dats-runner-02` | `302`       | `action-runner-dats-runner-02` | `30220`          |
| `dats-runner-99` | `399`       | `action-runner-dats-runner-99` | `39920`          |

The CI's `prepare-env` step extracts the two digits, builds the port prefix as `3<digits>`, and passes it to `bin/setup/setup-envs.sh`, which rewrites every port in the generated `.env` files. It also suffixes the Compose project name with the runner name, which isolates:

- **Ports** — each runner binds a distinct `3xx xx` range (e.g. API on `30120` vs `30220`).
- **Containers & networks** — named `<project>-<service>` and `<project>_dats_network`, so no cross-runner adoption.
- **Named volumes** — `<project>_postgres_data` etc., so one runner's `down -v` never deletes another's data.

Docker image tags are already unique per _run_ (suffixed with the GitHub `run_id`), so concurrent builds never overwrite each other's images.

!!! warning
Runner names **must end in exactly two digits**. Each runner is an explicit service in `compose.yml` with a hardcoded hostname (`dats-runner-01`, `dats-runner-02`, …). To add more runners, copy a service block and increment the suffix. The `prepare-env` step fails with a clear error if it can't extract exactly two digits from the runner name.

## Setting up the runner fleet

### Prerequisites

- Docker and Docker Compose installed on the host machine.
- A GitHub **Personal Access Token (PAT)** with `repo` scope (for repository-level runners) or `admin:org` scope (for organization-level runners). The PAT is used to request fresh registration tokens on the fly, avoiding the 60-minute expiration limit of standard UI tokens.

### 1. Configure the fleet

In the `action-runner/` directory, copy the environment template and fill in your credentials:

```bash
cp .env.example .env
```

```ini
GITHUB_OWNER=uhh-lt
GITHUB_REPO=dats
GITHUB_PAT=ghp_YourSuperSecretTokenHere
```

See the configuration reference in [action-runner/README.md](https://github.com/uhh-lt/dats/blob/main/action-runner/README.md) for optional settings like `RUNNER_GPU_DEVICE_ID`.

### 2. Prepare the Ray cache directory

The runners share a common Ray model cache on the host. Create it with proper permissions:

```bash
mkdir -p ~/ray_cache
chmod 777 ~/ray_cache
```

This directory is mounted into all runner containers and shared with sibling Ray containers spawned by CI jobs.

### 3. Start the fleet

```bash
docker compose up -d --build
```

This builds the runner image (which bundles Docker CLI + Compose plugin, `just`, `uv`, Node.js, `pwgen`, and `git` — everything the workflows need) and starts one container per service defined in `compose.yml`. Each container registers itself with GitHub under its hostname.

Useful commands:

| Command                  | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `docker compose up -d`   | Start all runners                                |
| `docker compose logs -f` | Stream logs from all runners                     |
| `docker compose down`    | Stop all runners and auto-deregister from GitHub |
| `docker compose ps`      | Show runner status and health                    |

To add more runners, copy one of the service blocks in `compose.yml`, increment the hostname suffix (e.g. `dats-runner-05`), and run `docker compose up -d`.

### 4. Verify in GitHub

Navigate to **Settings → Actions → Runners** in the repository. You should see one runner per service defined in `compose.yml` (`dats-runner-01`, `dats-runner-02`, …) with status **Idle** or **Active**.

## Architecture notes

- **Docker-out-of-Docker** — the host's `/var/run/docker.sock` is mounted into each runner container, so workflows can build images and spin up sibling containers (the DATS stack's databases, etc.) directly on the host.
- **Host networking** — `network_mode: "host"` lets CI scripts and backend tests reach sibling containers via `localhost:PORT` without network bridges.
- **Self-healing** — a cleanup trap in the entrypoint unregisters the runner from GitHub when its container stops, so no offline "ghost" runners linger in the dashboard.
- **Non-root execution** — jobs run as an unprivileged `runner` user inside the container; the entrypoint adds that user to the host's Docker group at runtime (detected from the socket's GID).

## Shared resources (intentionally not isolated)

A few resources are deliberately shared across all runners on the machine:

- **Disks** — all runners and their sibling containers write to the host's disks. Several concurrent jobs can saturate them, which slows down every job and everything else on the machine. The CI keeps its disk writes low: see [Keeping the disk load low](#keeping-the-disk-load-low).
- **Ray cache** (`$HOME/ray_cache`) — model downloads are cached machine-wide to avoid re-downloading large models for every runner. Concurrent access is tolerable for a cache.
- **GPU** — Ray jobs pin `RAY_DEVICE_IDS=1`. This means only one Ray-enabled job should run at a time per machine; running two concurrently will contend for the same GPU. If you need parallel Ray jobs, assign different GPUs per runner.
- **Hosted services** — LLM, embedding, and Docling endpoints point at shared hosted infrastructure (`ltdwise.informatik.uni-hamburg.de`), which is stateless and safe to share.

## Keeping the disk load low

Every job starts from a clean checkout (`actions/checkout` removes all untracked files, including `.venv` and `node_modules`), installs its dependencies, and starts its own DATS stack. Three measures keep the disk writes of this setup low:

- **Per-runner uv cache** — each runner keeps its uv cache in its own work directory (`UV_CACHE_DIR` in `action-runner/compose.yml`), so `uv sync` hardlinks the packages into a `.venv` instead of copying them. uv cannot hardlink across mounts: with the cache in a separate bind mount, every job copied 6+ GB per virtual environment.
- **Data services in memory** — `prepare-env` adds `docker/compose.ci.yml` to `COMPOSE_FILE` in the generated `docker/.env`. It replaces the volumes of PostgreSQL, Redis, Weaviate and Elasticsearch with tmpfs mounts, since a run throws its data away in the cleanup anyway.
- **Only the changed components** — `precommit-checks` installs and checks only the components (backend, frontend, ray) that a pull request or push changed. A change to `.pre-commit-config.yaml`, the `justfile` or `bin/` checks all of them.

The Dockerfiles pin the uv image (`ghcr.io/astral-sh/uv:<version>`): with `latest`, every uv release invalidated the cached image layers and rebuilt the full virtual environment of the image.

### Applying changes to the fleet

The fleet runs from a checkout of this repository. After a change to `action-runner/`, update that checkout and recreate the runners while they are idle (recreating a runner aborts its running job):

```bash
git pull
docker compose up -d --build
```

## Troubleshooting

**Job fails with "must end in two digits"**
The runner name doesn't match the convention. Check that each service in `compose.yml` has a `hostname` ending in exactly two digits (e.g. `dats-runner-05`).

**"Port is already allocated"**
Two runners are using the same port prefix. Ensure each runner has a unique two-digit suffix (check `docker compose ps` and the runner names in GitHub).

**One run's tests fail when another run starts**
This should not happen with per-runner Compose projects. Confirm the runners have distinct names and that `COMPOSE_PROJECT_NAME` differs between their generated `docker/.env` files.

**Runners appear offline after shutdown**
The cleanup trap should prevent this. If a container is killed forcefully (`docker kill`), the runner may remain registered — delete it manually from **Settings → Actions → Runners**.

**Jobs cannot reach services on `localhost`**
Ensure `network_mode: "host"` is still set in `compose.yml`. It is required for runners to access sibling containers via `localhost`.
