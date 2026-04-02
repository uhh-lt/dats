import logging
import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import docker
import requests
from docker.types import DeviceRequest

from schemas.config_schema import ModelConfig, VllmBackendConfig

logger = logging.getLogger(__name__)


def _build_vllm_command(model_config: ModelConfig) -> str:
    return (
        f"--model {model_config.name} "
        f"--served-model-name {model_config.alias} "
        f"--max-model-len {model_config.max_len} "
        f"--gpu-memory-utilization {model_config.gpu_memory_utilization} "
        f"--host 0.0.0.0"
    )


@contextmanager
def managed_vllm_container(
    model_config: ModelConfig,
    vllm_backend_config: VllmBackendConfig,
    keep_on_failure: bool = True,  # Useful for debugging
) -> Iterator[str]:
    """Spin up a vLLM OpenAI-compatible API container and tear it down automatically.

    Yields:
        Base URL of the running API server, e.g. "http://localhost:8000/v1".
    """
    client = docker.from_env()

    hf_cache_host = Path(vllm_backend_config.hf_cache_dir).expanduser()
    hf_cache_host.mkdir(parents=True, exist_ok=True)

    logger.info(
        "Starting vLLM Docker container (image=%s, model=%s, host_port=%s, gpu_id=%s)",
        vllm_backend_config.image,
        model_config.name,
        vllm_backend_config.host_port,
        vllm_backend_config.gpu_id,
    )

    container = client.containers.run(
        image=vllm_backend_config.image,
        command=_build_vllm_command(model_config),
        detach=True,
        ports={"8000/tcp": vllm_backend_config.host_port},
        environment={
            "HUGGING_FACE_HUB_TOKEN": os.environ[vllm_backend_config.hf_token_env_var]
        },
        device_requests=[
            DeviceRequest(
                device_ids=[str(vllm_backend_config.gpu_id)], capabilities=[["gpu"]]
            )
        ],
        volumes={
            str(hf_cache_host): {"bind": "/root/.cache/huggingface", "mode": "rw"}
        },
    )

    health_url = f"http://localhost:{vllm_backend_config.host_port}/v1/models"
    base_url = f"http://localhost:{vllm_backend_config.host_port}/v1"

    is_healthy = False

    try:
        max_attempts = max(1, vllm_backend_config.startup_timeout_seconds // 2)
        for _ in range(max_attempts):
            # Check if container died prematurely to avoid waiting out the full timeout
            container.reload()
            if container.status == "exited":
                logs = container.logs(tail=300).decode("utf-8", errors="ignore")
                raise RuntimeError(
                    f"vLLM container crashed prematurely with exit code {container.attrs['State']['ExitCode']}.\n"
                    f"Recent container logs:\n{logs}"
                )

            try:
                response = requests.get(health_url, timeout=2)
                if response.status_code == 200:
                    is_healthy = True
                    logger.info("vLLM container became healthy at %s", base_url)
                    yield base_url
                    return
            except requests.RequestException:
                pass

            time.sleep(2)

        # If we exit the loop without returning, it timed out
        logs = container.logs(tail=300).decode("utf-8", errors="ignore")
        raise RuntimeError(
            "vLLM container failed to become healthy within timeout. "
            f"Health endpoint: {health_url}\n"
            f"Recent container logs:\n{logs}"
        )
    finally:
        if not is_healthy and keep_on_failure:
            print(f"Skipping cleanup for debugging. Container ID: {container.id}")
            logger.warning(
                "Keeping failed vLLM container alive for debugging: %s", container.id
            )
        else:
            logger.info("Stopping and removing vLLM container %s", container.id)
            try:
                container.stop(timeout=10)
            except Exception:
                pass
            finally:
                container.remove(force=True)
