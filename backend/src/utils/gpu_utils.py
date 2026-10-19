def find_unused_cuda_device() -> str:
    import os
    import subprocess

    import torch

    if not torch.cuda.is_available() or torch.cuda.device_count() == 0:
        return "cpu"
    try:
        # Query free memory and utilization of all GPUs mounted into the container
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,uuid,memory.free,utilization.gpu",
                "--format=csv,nounits,noheader",
            ],
            stdout=subprocess.PIPE,
            encoding="utf-8",
        )
        smi_stats: list[tuple[str, str, int, int]] = []
        for line in result.stdout.strip().split("\n"):
            index, uuid, mem_free, util = (field.strip() for field in line.split(","))
            smi_stats.append((index, uuid, int(mem_free), int(util)))

        # nvidia-smi ignores CUDA_VISIBLE_DEVICES and lists every GPU, while torch
        # numbers only the visible ones: cuda:i is the i-th CUDA_VISIBLE_DEVICES entry
        # (an nvidia-smi index or a GPU UUID, see CUDA_DEVICE_ORDER=PCI_BUS_ID).
        visible = os.environ.get("CUDA_VISIBLE_DEVICES")
        visible_ids = (
            [entry.strip() for entry in visible.split(",")]
            if visible
            else [index for index, _, _, _ in smi_stats]
        )
        gpu_stats = []
        for cuda_index, visible_id in enumerate(visible_ids):
            for index, uuid, mem_free, util in smi_stats:
                if visible_id == index or uuid.startswith(visible_id):
                    gpu_stats.append((cuda_index, mem_free, util))
                    break
        # Prefer GPUs with 0% utilization, then most free memory
        unused_gpus = [stat for stat in gpu_stats if stat[2] == 0]
        if unused_gpus:
            gpu_index = max(unused_gpus, key=lambda x: x[1])[0]
        else:
            gpu_index = max(gpu_stats, key=lambda x: x[1])[0]
        return f"cuda:{gpu_index}"
    except Exception:
        return "cuda:0"


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
