import subprocess
import warnings

from loguru import logger

# User-facing message (stored in the job's status_message).
CUDA_UNAVAILABLE_MSG = (
    "CUDA is not available, but a GPU job was scheduled! "
    "The GPU worker cannot access a GPU. Please contact your administrator."
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
    """Raise RuntimeError if CUDA is unavailable.

    torch.cuda.is_available() swallows CUDA driver/runtime errors, returns False
    and only emits a warning with the actual cause. That warning is logged together
    with nvidia-smi diagnostics. Every job runs in a freshly forked work horse that
    never inherits a CUDA context, so a failure here means the container cannot
    reach the GPU (e.g. "Failed to initialize NVML: Unknown Error" after the
    container lost its /dev/nvidia* devices) and retrying in-process cannot help.
    """
    import torch

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        if torch.cuda.is_available():
            return

    causes = "\n".join(str(w.message) for w in caught) or "no warning emitted"
    logger.error(
        "torch.cuda.is_available() returned False for a GPU job. "
        f"Cause reported by torch: {causes}\n"
        f"Diagnostics:\n{_cuda_diagnostics()}"
    )
    raise RuntimeError(CUDA_UNAVAILABLE_MSG)
