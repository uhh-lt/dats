import argparse
import os
from pathlib import Path
from pprint import pprint

import srsly


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

    for app in spec["applications"]:
        name = app["import_path"].split(":")[0].split(".")[-1]
        app["name"] = name
        app["route_prefix"] = f"/{name}"

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
