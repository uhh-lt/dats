import gc
import subprocess

from loguru import logger

# Stable substring used by DATSWorker to detect CUDA-unavailable failures.
CUDA_UNAVAILABLE_REASON = "CUDA is not available, but a GPU job was scheduled!"
# User-facing message (stored in the job's status_message). Tells the user a
# retry may succeed, since the worker self-heals transient CUDA faults and
# restarts itself on persistent loss.
CUDA_UNAVAILABLE_MSG = (
    f"{CUDA_UNAVAILABLE_REASON} "
    "This is usually a temporary GPU issue - please try again. "
    "If it keeps failing, the GPU worker restarts itself automatically."
)


def _cuda_diagnostics() -> str:
    """Best-effort snapshot of CUDA/driver state for debugging. Never raises."""
    import torch

    lines = [f"torch.version.cuda={torch.version.cuda}"]
    try:
        lines.append(f"torch.cuda.device_count()={torch.cuda.device_count()}")
    except Exception as e:
        lines.append(f"torch.cuda.device_count() raised: {e!r}")
    try:
        result = subprocess.run(
            ["nvidia-smi"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            timeout=15,
        )
        lines.append(f"nvidia-smi output:\n{result.stdout.strip()}")
    except Exception as e:
        lines.append(f"nvidia-smi raised: {e!r}")
    return "\n".join(lines)


def ensure_cuda_available() -> None:
    """Raise RuntimeError if CUDA is unavailable, after one recovery attempt.

    torch.cuda.is_available() swallows CUDA driver/runtime errors and returns
    False, so a transient fault (leaked context/OOM/ECC-Xid from a prior job, a
    driver hiccup) surfaces as "not available". We log diagnostics, try to
    reclaim the runtime once, and re-check before giving up. Only a persistent
    failure raises.
    """
    import torch

    if torch.cuda.is_available():
        return

    logger.warning(
        "torch.cuda.is_available() returned False for a GPU job. "
        f"Diagnostics:\n{_cuda_diagnostics()}\nAttempting CUDA recovery..."
    )
    gc.collect()
    try:
        torch.cuda.empty_cache()
    except Exception as e:
        logger.warning(f"torch.cuda.empty_cache() raised during recovery: {e!r}")

    if torch.cuda.is_available():
        logger.info("CUDA became available again after recovery attempt.")
        return

    logger.error(
        "CUDA still unavailable after recovery attempt. "
        f"Diagnostics:\n{_cuda_diagnostics()}"
    )
    raise RuntimeError(CUDA_UNAVAILABLE_MSG)
