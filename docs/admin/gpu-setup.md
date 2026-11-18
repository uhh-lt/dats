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

Ray schedules a GPU deployment by its share of a GPU (`num_gpus`) and never checks the GPU memory. DATS therefore states in `ray/configs/ray_config.yaml` how much GPU memory a replica of each deployment needs (`gpu_memory_gb`), and computes the shares when Ray starts: the memory of the deployment divided by the memory of the GPU. All deployments fit on one GPU at their `max_replicas`, so a replica never waits for another deployment to scale down.

Ray needs a GPU with at least 22 GB, in practice a 24 GB GPU, and does not start on a smaller one. spaCy (`gpu.fill_with`) gets as many replicas as fit next to all other deployments at their `max_replicas`, up to its own `max_replicas` of 4: a larger GPU processes more documents at once. Four spaCy replicas process about twice as many documents as one; more replicas are not faster on one GPU.

Ray plans with the memory of the smallest GPU in `RAY_DEVICE_IDS`. If the GPU also runs other services, such as vLLM, set `gpu.memory_gb` to the memory left for Ray.

| Deployment | Memory per replica | Replicas | Measured with                                                              |
| ---------- | ------------------ | -------- | -------------------------------------------------------------------------- |
| spacy      | 2.7 GB             | 1 to 4   | 2M characters of English, in segments of 10k characters (`segment_length`) |
| whisper    | 4.2 GB             | 1        | 15 minutes of audio                                                        |
| detr       | 1.5 GB             | 1        | images of up to 4000 × 3000 pixels                                         |
| clip       | 3.6 GB             | 1        | 32 documents of 459 sentences, an image of 4000 × 3000 pixels              |
| quote      | 4.2 GB             | 0 to 1   | German documents of up to 25k characters                                   |
| coref      | 5.8 GB             | 0 to 1   | a German document of 10k characters                                        |

The values are the peak memory of a replica process as `nvidia-smi` shows it, measured on an A100 and rounded up; detr and clip use the higher values seen in production. They are budgets, not limits. All deployments but coref need the same memory for any input. coref needs about 0.06 GB more per 1,000 characters, so the budget holds for documents of about 10k characters: a much longer document can exceed the GPU while all other deployments are busy ([#920](https://github.com/uhh-lt/dats/issues/920)).

spacy and whisper (for the core artefacts) and detr and clip (for features that a new project enables) always run. quote and coref, whose features a new project does not enable, start with their first request (`min_replicas: 0`) and stop after 10 minutes without requests.

To run spaCy on the CPU instead, set `spacy.device` to `cpu` and remove its `gpu_memory_gb`.

## Troubleshooting

### `Failed to initialize NVML: Unknown Error` inside a container

If `nvidia-smi` works on the host but prints this error inside a container (`docker compose exec rq-gpu-worker nvidia-smi`), the container has lost access to its GPU device files. GPU jobs then fail with `CUDA is not available, but a GPU job was scheduled!`.

This happens on hosts with cgroup v2 and Docker's `systemd` cgroup driver (`docker info | grep -i cgroup`) when GPUs are requested with the legacy `driver: nvidia` instead of CDI: every `systemctl daemon-reload`, triggered for example by unattended upgrades, removes the GPU devices from running containers. Make sure all compose files on the host use `driver: cdi`, then restart the affected containers. To verify, run `sudo systemctl daemon-reload` and check that `nvidia-smi` still works inside the container.
