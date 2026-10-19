import fcntl
import os
import subprocess
import tempfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from loguru import logger

NVIDIA_SMI_TIMEOUT_SECONDS = 15
# GPU jobs run in work horses of the same container: each records the GPU it picked
# here (one file per PID), so concurrent GPU workers spread across the GPUs.
GPU_CLAIMS_DIR = Path(tempfile.gettempdir()) / "dats_gpu_claims"


@dataclass(frozen=True)
class GpuStats:
    uuid: str
    memory_free_mib: int
    utilization_percent: int


def parse_visible_gpus(
    smi_output: str, cuda_visible_devices: str | None
) -> list[GpuStats]:
    """Return the GPUs allowed by CUDA_VISIBLE_DEVICES, in that order.

    nvidia-smi ignores CUDA_VISIBLE_DEVICES and lists every GPU. Entries are matched
    by nvidia-smi index (see CUDA_DEVICE_ORDER=PCI_BUS_ID) or GPU UUID (prefix).

    Args:
        smi_output: Output of `nvidia-smi --query-gpu=index,uuid,memory.free,
            utilization.gpu --format=csv,nounits,noheader`.
        cuda_visible_devices: Value of CUDA_VISIBLE_DEVICES, None if unset.
    """
    smi_rows: list[tuple[str, str, int, int]] = []
    for line in smi_output.strip().splitlines():
        index, uuid, mem_free, util = (field.strip() for field in line.split(","))
        smi_rows.append((index, uuid, int(mem_free), int(util)))

    visible_ids = (
        [entry.strip() for entry in cuda_visible_devices.split(",")]
        if cuda_visible_devices
        else [index for index, _, _, _ in smi_rows]
    )
    gpus: list[GpuStats] = []
    for visible_id in visible_ids:
        for index, uuid, mem_free, util in smi_rows:
            if visible_id == index or uuid.startswith(visible_id):
                gpus.append(GpuStats(uuid, mem_free, util))
                break
    return gpus


def pick_gpu(gpus: list[GpuStats], active_claims: Counter[str]) -> str:
    """Return the UUID of the best GPU.

    Prefers GPUs with the fewest running DATS jobs, then idle GPUs (0% utilization),
    then the most free memory.
    """
    if not gpus:
        raise ValueError("No visible GPU found in nvidia-smi output")
    best = min(
        gpus,
        key=lambda gpu: (
            active_claims[gpu.uuid],
            gpu.utilization_percent > 0,
            -gpu.memory_free_mib,
        ),
    )
    return best.uuid


def _is_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _active_claims(claims_dir: Path) -> Counter[str]:
    """Count the GPUs claimed by running processes, removing stale claims."""
    claims: Counter[str] = Counter()
    for claim in claims_dir.iterdir():
        if not claim.name.isdigit() or not _is_alive(int(claim.name)):
            claim.unlink(missing_ok=True)
            continue
        claims[claim.read_text()] += 1
    return claims


def _query_nvidia_smi() -> str:
    result = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=index,uuid,memory.free,utilization.gpu",
            "--format=csv,nounits,noheader",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        encoding="utf-8",
        timeout=NVIDIA_SMI_TIMEOUT_SECONDS,
        check=True,
    )
    return result.stdout


def select_gpu() -> str | None:
    """Pick the best GPU for this job's process and return its UUID.

    Only uses nvidia-smi, so it can run before CUDA is initialized. Returns None (and
    logs why) if no GPU could be selected.
    """
    try:
        GPU_CLAIMS_DIR.mkdir(parents=True, exist_ok=True)
        # the lock serializes the selection, so two horses never see the same claims
        with open(GPU_CLAIMS_DIR / ".lock", "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            gpus = parse_visible_gpus(
                _query_nvidia_smi(), os.environ.get("CUDA_VISIBLE_DEVICES")
            )
            uuid = pick_gpu(gpus, _active_claims(GPU_CLAIMS_DIR))
            (GPU_CLAIMS_DIR / str(os.getpid())).write_text(uuid)
        return uuid
    except Exception as e:
        logger.warning(f"Could not select a GPU: {e!r}")
        return None


def pin_gpu(uuid: str) -> None:
    """Make `uuid` the only GPU this process can see, as cuda:0.

    Must run before CUDA is initialized in this process (CUDA reads
    CUDA_VISIBLE_DEVICES once). Then every library uses the selected GPU, even those
    that hardcode cuda:0 (e.g. the HF Trainer), and none wraps models in DataParallel.
    """
    os.environ["CUDA_VISIBLE_DEVICES"] = uuid


def set_cuda_memory_limit(limit_gb: int):
    import torch

    limit_bytes = limit_gb * 1024 * 1024 * 1024

    # set GPU memory limit for job
    total = torch.cuda.get_device_properties().total_memory
    allowed_fraction = limit_bytes / total
    torch.cuda.set_per_process_memory_fraction(allowed_fraction)


def parse_device_string(device_str: str) -> tuple[str, list[int]]:
    """
    Parses a device string and returns the appropriate device configuration.

    Args:
        device_str: A string representing the device, e.g., "cuda:0", "cuda:1", "cpu".

    Returns:
        A tuple (accelerator, devices) suitable for PyTorch Lightning Trainer.
    """
    if device_str.startswith("cuda:"):
        gpu_index = int(device_str.split(":")[1])
        return "gpu", [gpu_index]
    elif device_str == "cpu":
        return "cpu", []
    else:
        raise ValueError(f"Unsupported device string: {device_str}")
