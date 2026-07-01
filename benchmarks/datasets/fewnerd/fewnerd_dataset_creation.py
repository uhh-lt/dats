from __future__ import annotations

from pathlib import Path

from datasets import load_dataset


def create_fewnerd_dataset(output_path: Path) -> None:
    dataset = load_dataset("DFKI-SLT/few-nerd", "supervised")
    df = dataset["test"].to_pandas()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output_path, index=False)

    print("Few-NERD dataset download completed.")
    print(f"Rows: {len(df)} -> {output_path}")


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    output_path = project_root / "datasets/fewnerd/fewnerd_test.parquet"
    create_fewnerd_dataset(output_path=output_path)


if __name__ == "__main__":
    main()
