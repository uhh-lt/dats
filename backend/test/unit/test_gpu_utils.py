import os
from collections import Counter
from pathlib import Path

import pytest

from utils import gpu_utils
from utils.gpu_utils import GpuStats, parse_visible_gpus, pick_gpu

# nvidia-smi --query-gpu=index,uuid,memory.free,utilization.gpu
SMI_OUTPUT = """0, GPU-aaa, 20000, 0
1, GPU-bbb, 5000, 0
2, GPU-ccc, 40000, 50
3, GPU-ddd, 46000, 0
"""


@pytest.mark.parametrize(
    ("cuda_visible_devices", "expected"),
    [
        # unset: every GPU in nvidia-smi order
        (
            None,
            [
                GpuStats("GPU-aaa", 20000, 0),
                GpuStats("GPU-bbb", 5000, 0),
                GpuStats("GPU-ccc", 40000, 50),
                GpuStats("GPU-ddd", 46000, 0),
            ],
        ),
        # entries are nvidia-smi indices, in the order of CUDA_VISIBLE_DEVICES
        ("1,3", [GpuStats("GPU-bbb", 5000, 0), GpuStats("GPU-ddd", 46000, 0)]),
        ("2,0", [GpuStats("GPU-ccc", 40000, 50), GpuStats("GPU-aaa", 20000, 0)]),
        # GPU UUIDs (and their prefixes) are valid entries, too
        (
            "GPU-ccc,GPU-a",
            [GpuStats("GPU-ccc", 40000, 50), GpuStats("GPU-aaa", 20000, 0)],
        ),
        # unknown entries are skipped
        ("9", []),
    ],
)
def test_parse_visible_gpus(
    cuda_visible_devices: str | None, expected: list[GpuStats]
) -> None:
    assert parse_visible_gpus(SMI_OUTPUT, cuda_visible_devices) == expected


def test_pick_gpu_prefers_idle_gpu_with_most_free_memory() -> None:
    gpus = parse_visible_gpus(SMI_OUTPUT, None)
    assert pick_gpu(gpus, Counter()) == "GPU-ddd"


def test_pick_gpu_prefers_idle_over_busy_gpu_with_more_memory() -> None:
    gpus = parse_visible_gpus(SMI_OUTPUT, "1,2")
    assert pick_gpu(gpus, Counter()) == "GPU-bbb"


def test_pick_gpu_spreads_jobs_across_gpus() -> None:
    gpus = parse_visible_gpus(SMI_OUTPUT, None)
    # GPU-ddd already runs a DATS job, so the next best idle GPU is chosen
    assert pick_gpu(gpus, Counter({"GPU-ddd": 1})) == "GPU-aaa"
    assert pick_gpu(gpus, Counter({"GPU-ddd": 1, "GPU-aaa": 1})) == "GPU-bbb"


def test_pick_gpu_without_gpus_raises() -> None:
    with pytest.raises(ValueError):
        pick_gpu([], Counter())


def test_active_claims_ignores_and_removes_stale_claims(tmp_path: Path) -> None:
    (tmp_path / str(os.getpid())).write_text("GPU-bbb")
    # PIDs above the kernel's pid_max never belong to a running process
    stale = tmp_path / "99999999"
    stale.write_text("GPU-aaa")

    assert gpu_utils._active_claims(tmp_path) == Counter({"GPU-bbb": 1})
    assert not stale.exists()


def test_select_gpu_claims_selected_gpu(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(gpu_utils, "_query_nvidia_smi", lambda: SMI_OUTPUT)
    monkeypatch.setattr(gpu_utils, "GPU_CLAIMS_DIR", tmp_path)
    monkeypatch.setenv("CUDA_VISIBLE_DEVICES", "1,3")

    assert gpu_utils.select_gpu() == "GPU-ddd"
    assert (tmp_path / str(os.getpid())).read_text() == "GPU-ddd"


def test_select_gpu_returns_none_on_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(gpu_utils, "GPU_CLAIMS_DIR", tmp_path)

    def broken_nvidia_smi() -> str:
        raise TimeoutError("nvidia-smi hangs")

    monkeypatch.setattr(gpu_utils, "_query_nvidia_smi", broken_nvidia_smi)

    assert gpu_utils.select_gpu() is None


def test_pin_gpu_restricts_cuda_to_the_selected_gpu(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CUDA_VISIBLE_DEVICES", "1,3")
    gpu_utils.pin_gpu("GPU-ddd")
    assert os.environ["CUDA_VISIBLE_DEVICES"] == "GPU-ddd"
