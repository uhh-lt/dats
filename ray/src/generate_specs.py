import argparse
import math
import os
import subprocess
from pathlib import Path
from pprint import pprint

import srsly

from config import conf

# Ray schedules GPU shares in steps of 0.0001
SHARE_STEPS = 10_000


def get_all_apps(
    apps_path: Path,
    ignore_apps: list[str] = [],
) -> list[str]:
    apps = []
    for app in apps_path.glob("./*.py"):
        if app.stem in ignore_apps:
            continue
        if "app = " in app.read_text():
            apps.append(f"apps.{app.stem}:app")
    return apps


def rename_app_names(generated_spec_fp: Path, spec_out_fp: Path):
    print("Renaming generated app names...")
    spec = srsly.read_yaml(generated_spec_fp)
    if not isinstance(spec, dict) or "applications" not in spec:
        raise ValueError("Invalid spec format: 'applications' key not found")
    glitchtip_dsn = os.environ.get("GLITCHTIP_DSN")
    for app in spec["applications"]:
        name = app["import_path"].split(":")[0].split(".")[-1]
        app["name"] = name
        app["route_prefix"] = f"/{name}"

        if glitchtip_dsn:
            # Initialize runtime_env and env_vars dictionaries if they don't exist yet
            if "runtime_env" not in app:
                app["runtime_env"] = {}
            if "env_vars" not in app["runtime_env"]:
                app["runtime_env"]["env_vars"] = {}

            app["runtime_env"]["env_vars"]["GLITCHTIP_DSN"] = glitchtip_dsn
        else:
            print(
                f"Warning: GLITCHTIP_DSN not found in environment. Skipping injection for app: {name}"
            )

    srsly.write_yaml(spec_out_fp, spec)
    print(f"Successfully renamed app names in {spec_out_fp}!")


def set_http_port(spec_fp: Path, port: int):
    print(f"Setting http port to {port} in {spec_fp}...")
    spec = srsly.read_yaml(spec_fp)
    if not isinstance(spec, dict) or "http_options" not in spec:
        raise ValueError("Invalid spec format: 'http_options' key not found")
    spec["http_options"]["port"] = port
    srsly.write_yaml(spec_fp, spec)
    print(f"Successfully set http port to {port} in {spec_fp}!")


def read_gpus() -> tuple[float, int]:
    """Returns the GPU memory in GB that Ray plans with and the number of GPUs Ray may use.
    The memory is gpu.memory_gb of the config, else that of the smallest GPU in
    CUDA_VISIBLE_DEVICES (the indices of nvidia-smi, see compose.ray.yml)."""
    visible = os.environ.get("CUDA_VISIBLE_DEVICES")
    ids = [i.strip() for i in visible.split(",")] if visible else None
    memory_gb = conf.gpu.memory_gb
    if memory_gb is not None and ids is not None:
        return float(memory_gb), len(ids)

    query = subprocess.run(
        ["nvidia-smi", "--query-gpu=index,memory.total", "--format=csv,noheader"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    # memory.total is in MiB, GPUs are sold in GiB as "GB"
    total_gb = {
        index.strip(): int(total.split()[0]) / 1024
        for index, total in (line.split(",") for line in query.splitlines())
    }
    ids = ids if ids is not None else list(total_gb)
    if memory_gb is not None:
        return float(memory_gb), len(ids)
    return min(total_gb[i] for i in ids), len(ids)


def set_gpu_shares(spec_fp: Path) -> None:
    """Sets the GPU share of every deployment with a gpu_memory_gb to its memory divided
    by the GPU memory. The deployment gpu.fill_with gets as many replicas (up to its
    max_replicas) as fit next to all other deployments at their max_replicas, so that
    every deployment can always scale up to its max_replicas."""
    print(f"Setting the GPU shares in {spec_fp}...")
    spec = srsly.read_yaml(spec_fp)
    if not isinstance(spec, dict) or "applications" not in spec:
        raise ValueError("Invalid spec format: 'applications' key not found")

    # the model worker deployment and its GPU memory per app
    workers: dict[str, tuple[dict, float]] = {}
    for app in spec["applications"]:
        deployment_cc = conf[app["name"]].deployment
        memory_gb = deployment_cc.model_worker.get("gpu_memory_gb")
        if memory_gb is None:
            continue
        worker = next(
            d for d in app["deployments"] if d["name"] != deployment_cc.api.name
        )
        workers[app["name"]] = (worker, float(memory_gb))
    if not workers:
        return

    gpu_gb, num_gpus = read_gpus()
    shares = {
        name: math.ceil(memory_gb / gpu_gb * SHARE_STEPS)
        for name, (_, memory_gb) in workers.items()
    }
    too_large = [name for name, share in shares.items() if share > SHARE_STEPS]
    if too_large:
        raise SystemExit(f"{too_large} need more than the {gpu_gb:.1f} GB of a GPU!")

    fill = conf.gpu.fill_with
    used = sum(
        shares[name] * worker["autoscaling_config"]["max_replicas"]
        for name, (worker, _) in workers.items()
        if name != fill
    )
    if fill in workers:
        worker, memory_gb = workers[fill]
        autoscaling = worker["autoscaling_config"]
        # the replicas of one deployment cannot span GPUs: each GPU may leave a
        # remainder smaller than a replica
        fits = (num_gpus * SHARE_STEPS - used) // shares[fill] - (num_gpus - 1)
        if fits < autoscaling["min_replicas"]:
            needed = (
                used / SHARE_STEPS * gpu_gb + memory_gb * autoscaling["min_replicas"]
            )
            raise SystemExit(
                f"Ray needs a GPU with at least {needed:.1f} GB, found {gpu_gb:.1f} GB!"
            )
        autoscaling["max_replicas"] = min(fits, autoscaling["max_replicas"])
    elif used > num_gpus * SHARE_STEPS:
        needed = used / SHARE_STEPS * gpu_gb
        raise SystemExit(
            f"Ray needs a GPU with at least {needed:.1f} GB, found {gpu_gb:.1f} GB!"
        )

    for name, (worker, memory_gb) in workers.items():
        worker.setdefault("ray_actor_options", {})["num_gpus"] = (
            shares[name] / SHARE_STEPS
        )
        print(
            f"{name}: {memory_gb} GB -> num_gpus {shares[name] / SHARE_STEPS}, "
            f"max_replicas {worker['autoscaling_config']['max_replicas']}"
        )
    srsly.write_yaml(spec_fp, spec)
    print(f"Planned with {num_gpus} GPU(s) of {gpu_gb:.1f} GB.")


def run_build_cmd(
    apps: list[str],
    spec_out_fp: Path,
) -> Path:
    gen_spec_fn = spec_out_fp.with_suffix(".generated")
    build_cmd = f"serve build {' '.join(apps)} -o {gen_spec_fn}"
    print(f"Running ray serve build command:\n{build_cmd}")
    output_stream = os.popen(build_cmd)
    print(output_stream.read())
    assert gen_spec_fn.exists(), f"Can't find generated spec file at {gen_spec_fn}!"

    return gen_spec_fn


def generate(
    apps_path: str | Path = "./apps",
    spec_out_fp: str | Path = "./spec.yaml",
    overwrite_existing: bool = True,
    ignore_apps: list[str] = [],
    set_http_port_value: "int | None" = None,
):
    print("Generating ray serve spec file...")

    apps_path = Path(apps_path)
    assert apps_path.exists(), f"Can't find apps directory at {apps_path}!"

    spec_out_fp = Path(spec_out_fp)
    if spec_out_fp.exists():
        if overwrite_existing:
            print(f"Print overwriting existing spec file at {spec_out_fp}!")
        else:
            raise SystemExit(f"Spec file already exists at {spec_out_fp}!")

    apps = get_all_apps(apps_path, ignore_apps)

    generated_spec_fp = run_build_cmd(apps, spec_out_fp)

    rename_app_names(generated_spec_fp, spec_out_fp)

    set_gpu_shares(spec_out_fp)

    if set_http_port_value is not None:
        set_http_port(spec_out_fp, set_http_port_value)

    print("Cleaning up ...")
    generated_spec_fp.unlink()

    print(f"Successfully generated spec file at {spec_out_fp}!")
    pprint(srsly.read_yaml(spec_out_fp))


if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument(
        "--apps_path",
        type=str,
        default="./apps",
        help="Path to the directory containing all apps",
    )
    arg_parser.add_argument(
        "--spec_out_fp",
        type=str,
        default="./spec.yaml",
        help="Path to the output spec file",
    )
    arg_parser.add_argument(
        "--overwrite_existing",
        type=bool,
        default=True,
        help="Overwrite existing spec file",
    )
    arg_parser.add_argument(
        "--ignore_apps",
        type=str,
        nargs="+",
        default=[],
        help="List of apps to ignore",
    )

    arg_parser.add_argument(
        "--set_http_port",
        type=int,
        default=None,
        help="Set the http port in the generated spec file",
    )

    args = arg_parser.parse_args()
    generate(
        apps_path=args.apps_path,
        spec_out_fp=args.spec_out_fp,
        overwrite_existing=args.overwrite_existing,
        ignore_apps=args.ignore_apps,
        set_http_port_value=args.set_http_port,
    )
