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

## Sizing the Ray deployments

Each GPU deployment in `ray/configs/ray_config.yaml` requests a share of one GPU per replica (`ray_actor_options.num_gpus`). Ray starts a replica only if its share still fits on one of the GPUs in `RAY_DEVICE_IDS`; a replica that does not fit waits, and the Ray healthcheck reports the deployment as unhealthy meanwhile. The shares do not limit the GPU memory, so they should roughly reflect it.

| Deployment          | Share per replica | Replicas |
| ------------------- | ----------------- | -------- |
| whisper, detr, clip | 0.2 each          | 1        |
| spacy               | 0.2               | 1 to 2   |
| quote, coref        | 0.2 each          | 0 to 1   |

The defaults need 0.8 to 1.0 GPUs, and up to 1.4 GPUs while quote and coref are in use. On a single GPU, quote and coref therefore only start while spaCy runs a single replica; give Ray a second GPU for them.

A spaCy replica needs up to about 4.5 GB of GPU memory: about 2.5 GB for the models and up to 2 GB for a segment of `spacy.segment_length` characters (50,000 by default; longer texts are processed segment by segment). On hosts with more GPUs, raise `spacy.deployment.model_worker.autoscaling_config.max_replicas` for throughput: on an A100, four replicas process about twice as many documents as one. To run spaCy on the CPU instead, set `spacy.device` to `cpu` and its `num_gpus` to `0.0`.

## Troubleshooting

### `Failed to initialize NVML: Unknown Error` inside a container

If `nvidia-smi` works on the host but prints this error inside a container (`docker compose exec rq-gpu-worker nvidia-smi`), the container has lost access to its GPU device files. GPU jobs then fail with `CUDA is not available, but a GPU job was scheduled!`.

This happens on hosts with cgroup v2 and Docker's `systemd` cgroup driver (`docker info | grep -i cgroup`) when GPUs are requested with the legacy `driver: nvidia` instead of CDI: every `systemctl daemon-reload`, triggered for example by unattended upgrades, removes the GPU devices from running containers. Make sure all compose files on the host use `driver: cdi`, then restart the affected containers. To verify, run `sudo systemctl daemon-reload` and check that `nvidia-smi` still works inside the container.
