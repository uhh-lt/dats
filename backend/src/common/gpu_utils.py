def find_unused_cuda_device() -> str:
    import subprocess

    import torch

    if not torch.cuda.is_available() or torch.cuda.device_count() == 0:
        return "cpu"
    try:
        # Query free memory and utilization
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.free,utilization.gpu",
                "--format=csv,nounits,noheader",
            ],
            stdout=subprocess.PIPE,
            encoding="utf-8",
        )
        lines = result.stdout.strip().split("\n")
        gpu_stats = []
        for i, line in enumerate(lines):
            mem_free, util = map(int, line.split(","))
            gpu_stats.append((i, mem_free, util))
        # Prefer GPUs with 0% utilization, then most free memory
        unused_gpus = [stat for stat in gpu_stats if stat[2] == 0]
        if unused_gpus:
            gpu_index = max(unused_gpus, key=lambda x: x[1])[0]
        else:
            gpu_index = max(gpu_stats, key=lambda x: x[1])[0]
        return f"cuda:{gpu_index}"
    except Exception:
        return "cuda:0"


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
