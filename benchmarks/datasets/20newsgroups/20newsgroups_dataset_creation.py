from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any, Literal, cast

import pandas as pd
from sklearn.datasets import fetch_20newsgroups

TARGET_CATEGORIES = [
    "alt.atheism",
    "comp.graphics",
    "sci.space",
    "talk.politics.mideast",
]


def _clean_text(text: str, max_chars: int) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= max_chars:
        return normalized
    return normalized[:max_chars].rstrip()


def preprocess_20newsgroups(
    output_raw: Path,
    output_processed: Path,
    subset: Literal["train", "test", "all"],
    samples_per_class: int,
    seed: int,
    max_chars: int,
) -> None:
    dataset = cast(
        Any,
        fetch_20newsgroups(
            subset=subset,
            categories=TARGET_CATEGORIES,
            remove=("headers", "footers", "quotes"),
        ),
    )

    targets = [int(item) for item in dataset.target]

    df = pd.DataFrame(
        {
            "document_id": list(range(len(dataset.data))),
            "document_text": [
                _clean_text(str(text), max_chars=max_chars) for text in dataset.data
            ],
            "target": targets,
        }
    )
    df["label"] = df["target"].map(lambda x: TARGET_CATEGORIES[int(x)])

    # remove rows with empty document text after cleaning
    df = df[df["document_text"].str.strip() != ""].copy()

    output_raw.parent.mkdir(parents=True, exist_ok=True)
    output_processed.parent.mkdir(parents=True, exist_ok=True)

    df.to_parquet(output_raw, index=False)

    sampled_parts: list[pd.DataFrame] = []
    for _, group in df.groupby("label"):
        sampled_parts.append(
            group.sample(
                n=min(samples_per_class, len(group)),
                random_state=seed,
            )
        )

    sampled_df = pd.concat(sampled_parts, ignore_index=True)

    sampled_df.to_parquet(output_processed, index=False)

    print("20 Newsgroups preprocessing completed.")
    print(f"Raw rows: {len(df)} -> {output_raw}")
    print(f"Label distribution (raw):")
    print(df["label"].value_counts().to_dict())
    print(f"Sampled rows: {len(sampled_df)} -> {output_processed}")
    print("Label distribution (sampled):")
    print(sampled_df["label"].value_counts().to_dict())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preprocess 20 Newsgroups for benchmarking"
    )
    parser.add_argument("--subset", default="test", choices=["train", "test", "all"])
    parser.add_argument("--samples-per-class", type=int, default=30)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-chars", type=int, default=3000)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[2]

    preprocess_20newsgroups(
        output_raw=project_root / "datasets/20newsgroups/test_full_raw.parquet",
        output_processed=project_root / "datasets/20newsgroups/test_sampled.parquet",
        subset=args.subset,
        samples_per_class=args.samples_per_class,
        seed=args.seed,
        max_chars=args.max_chars,
    )


if __name__ == "__main__":
    main()
