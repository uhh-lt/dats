# GPU Setup

DATS runs its GPU workloads in Docker containers: the `rq-gpu-worker` (`compose.yml`), Ray (`compose.ray.yml`), vLLM (`compose.vllm.yml`) and Docling (`compose.docling.yml`). All of them request their GPUs via the [Container Device Interface (CDI)](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/cdi-support.html).

## Requirements

- An NVIDIA driver and the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html). Recent versions generate the CDI specification automatically (`nvidia-cdi-refresh` service, written to `/var/run/cdi/nvidia.yaml`).
- Docker with CDI support, enabled by default in recent Docker versions.

Check both on the host:

```bash
nvidia-ctk cdi list
docker info | grep -iA6 "cdi spec"
```

The first command must list devices such as `nvidia.com/gpu=0` and `nvidia.com/gpu=all`, and `docker info` must show them under `Discovered Devices`. If no specification exists, generate it with `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml`. Do not do this if one already exists in `/var/run/cdi`: duplicate device names make Docker refuse to start the containers.

## Choosing GPUs

GPUs are configured in `docker/.env` by their index as shown by `nvidia-smi`:

| Variable                                   | Format                               | Example |
| ------------------------------------------ | ------------------------------------ | ------- |
| `RQ_DEVICE_IDS`                            | one or more indices, comma separated | `0,2`   |
| `RAY_DEVICE_IDS`                           | one or more indices, comma separated | `0`     |
| `DOCLING_DEVICE_IDS`                       | one or more indices, comma separated | `1`     |
| `VLLM_LLM_DEVICE_ID`, `VLLM_EMB_DEVICE_ID` | exactly one index or GPU UUID        | `1`     |

CDI needs one entry per device and Compose cannot split a variable into a list. Services that accept several GPUs therefore mount all GPUs and restrict themselves to the configured ones via `CUDA_VISIBLE_DEVICES` (with `CUDA_DEVICE_ORDER=PCI_BUS_ID`, so the indices match `nvidia-smi`). `all` is not a valid value for these variables; list the indices instead.

The `rq-gpu-worker` runs every GPU job on a single GPU from `RQ_DEVICE_IDS`: it prefers GPUs without other running DATS jobs, then idle GPUs, then the most free memory, and restricts the job to that GPU. Its healthcheck (`python src/worker.py healthcheck gpu`) also fails when the container cannot reach its GPUs anymore. The backend API does not wait for the GPU worker to be healthy, so a GPU problem does not keep DATS from starting.

## Troubleshooting

### `Failed to initialize NVML: Unknown Error` inside a container

If `nvidia-smi` works on the host but prints this error inside a container (`docker compose exec rq-gpu-worker nvidia-smi`), the container has lost access to its GPU device files. GPU jobs then fail with `CUDA is not available, but a GPU job was scheduled!`.

This happens on hosts with cgroup v2 and Docker's `systemd` cgroup driver (`docker info | grep -i cgroup`) when GPUs are requested with the legacy `driver: nvidia` instead of CDI: every `systemctl daemon-reload`, triggered for example by unattended upgrades, removes the GPU devices from running containers. Make sure all compose files on the host use `driver: cdi`, then restart the affected containers. To verify, run `sudo systemctl daemon-reload` and check that `nvidia-smi` still works inside the container.
