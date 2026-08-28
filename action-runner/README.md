# Dockerized GitHub Actions Runner Fleet

This directory contains the infrastructure to run an automated, scalable fleet of self-hosted GitHub Actions runners. It replaces manual server configuration with ephemeral Docker containers that auto-register, execute jobs, and cleanly deregister themselves.

## Core Capabilities

- **Dynamic Automation:** Uses a Personal Access Token (PAT) to request fresh registration tokens on the fly, avoiding the 60-minute expiration limit of standard UI tokens.
- **Docker-out-of-Docker:** Mounts the host's `/var/run/docker.sock`, granting workflows the ability to build images and spin up sibling containers (like database dependencies) directly on the host machine.
- **Host Networking:** Configured with `network_mode: "host"`. CI scripts and backend tests can connect to sibling database containers using `localhost:PORT` without complex network bridges.
- **Self-Healing:** Automatically deletes offline "ghost" runners from the GitHub dashboard when containers are stopped.

## Prerequisites

- Docker and Docker Compose installed on the host machine.
- **Docker Compose v2.24.0+** (required for `{{.Task.Slot}}` hostname templating).
- A GitHub Personal Access Token (PAT) with `repo` scope (for repository-level runners) or `admin:org` scope (for organization-level runners).

## Initial Setup

### 1. Prepare the environment

Duplicate the template configuration file:

```bash
cp .env.example .env
```

### 2. Add your credentials

Edit the `.env` file with your specific repository and token details:

```ini
GITHUB_OWNER=your-username-or-org
GITHUB_REPO=your-repository-name
GITHUB_PAT=ghp_YourSuperSecretTokenHere
```

### 3. Prepare the Ray cache directory

The runners share a common Ray model cache on the host. Create it with proper permissions:

```bash
mkdir -p ~/ray_cache
chmod 777 ~/ray_cache
```

This directory is mounted into all runner containers and shared with sibling Ray containers spawned by CI jobs.

## Managing the Fleet

| Command                                 | Description                                            |
| --------------------------------------- | ------------------------------------------------------ |
| `docker compose up -d --build`          | Build the image and start all runners in detached mode |
| `docker compose up -d --scale runner=6` | Scale to 6 concurrent runners                          |
| `docker compose logs -f`                | Stream logs from all runners                           |
| `docker compose down`                   | Stop all runners and auto-deregister from GitHub       |
| `docker compose ps`                     | Show runner status and health                          |

## Viewing Runners in GitHub

After starting the fleet, verify your runners are registered and online:

1. Navigate to your repository on GitHub
2. Go to **Settings > Actions > Runners**
3. You should see 4 runners (or your scaled count) with status **Idle** or **Active**

Each runner is named sequentially with zero-padded two-digit suffixes: `dats-runner-01`, `dats-runner-02`, etc. (configurable via `RUNNER_NAME_PREFIX`).

!!! warning "CI Compatibility"
The runner names **must end in exactly two digits** (e.g., `dats-runner-01`). The CI's `prepare-env` step extracts these digits to compute port prefixes (`501`, `502`) and Compose project names. This ensures multiple runners can execute jobs concurrently without port or container conflicts.

## Configuration Reference

| Environment Variable   | Description                                      | Default       | Required |
| ---------------------- | ------------------------------------------------ | ------------- | -------- |
| `GITHUB_OWNER`         | GitHub username or organization name             | —             | Yes      |
| `GITHUB_REPO`          | Repository name                                  | —             | Yes      |
| `GITHUB_PAT`           | Personal Access Token with `repo` scope          | —             | Yes      |
| `RUNNER_REPLICAS`      | Number of runner containers to spawn             | `4`           | No       |
| `RUNNER_NAME_PREFIX`   | Prefix for runner names (e.g., `dats-runner-01`) | `dats`        | No       |
| `RUNNER_GPU_DEVICE_ID` | GPU device ID for runner containers              | `0`           | No       |
| `COMPOSE_PROJECT_NAME` | Docker Compose project name for grouping         | `dats-action` | No       |

## CI Compatibility

This Dockerized setup is fully compatible with the existing DATS CI system documented in [docs/development/github-action-runner.md](../docs/development/github-action-runner.md).

### How Isolation Works

Each runner gets a unique identity from its hostname (`dats-runner-01`, `dats-runner-02`, etc.):

| Runner name      | Port prefix | Compose project                | Example API port |
| ---------------- | ----------- | ------------------------------ | ---------------- |
| `dats-runner-01` | `501`       | `action-runner-dats-runner-01` | `50120`          |
| `dats-runner-02` | `502`       | `action-runner-dats-runner-02` | `50220`          |

The CI's `prepare-env` step extracts the two digits, builds the port prefix as `5<digits>`, and passes it to `bin/setup/setup-envs.sh`, which rewrites every port in the generated `.env` files.

### Shared Resources

- **Ray cache** (`$HOME/ray_cache`) — mounted into all containers to share model downloads
- **GPU** — Ray jobs pin `RAY_DEVICE_IDS=1`; only one Ray job should run at a time per machine
- **Hosted services** — LLM, embedding, and Docling endpoints point at shared infrastructure

### Installed Tools

The Docker image includes all tools required by CI workflows:

- Docker CLI + Compose plugin
- `just` command runner
- `uv` Python package manager
- Node.js
- `pwgen` (for secret generation)
- `git`

## Troubleshooting

### Runners appear offline after shutdown

This should not happen due to the cleanup trap in `entrypoint.sh`. If it does, manually delete the runner from **Settings > Actions > Runners** in your repository.

### Permission denied on `/var/run/docker.sock`

The container runs as root (`RUNNER_ALLOW_RUNASROOT=1`) to avoid this. If you modify the Dockerfile to run as a non-root user, ensure that user is in the `docker` group.

### Jobs cannot reach services on `localhost`

Ensure `network_mode: "host"` is set in `compose.yml`. This is required for the runner to access sibling containers via `localhost`.

## Updating the Runner Version

The GitHub Actions Runner version is pinned in the `Dockerfile` (currently `2.319.1`). To update:

1. Check the latest release at [github.com/actions/runner/releases](https://github.com/actions/runner/releases)
2. Update the version in `Dockerfile`:
   ```dockerfile
   RUN curl -o actions-runner-linux-x64-2.320.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.320.0/actions-runner-linux-x64-2.320.0.tar.gz \
       && tar xzf ./actions-runner-linux-x64-2.320.0.tar.gz \
       && rm actions-runner-linux-x64-2.320.0.tar.gz
   ```
3. Rebuild and restart the fleet:
   ```bash
   docker compose up -d --build
   ```
