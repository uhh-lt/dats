from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd
from datasets import load_dataset


def _normalize_answers(raw_answers: Any) -> tuple[list[str], list[int]]:
    if not isinstance(raw_answers, dict):
        return [], []

    answer_texts = [str(item) for item in raw_answers.get("text", [])]
    answer_starts = [int(item) for item in raw_answers.get("answer_start", [])]
    return answer_texts, answer_starts


def create_squad_dataset(split: str, output_path: Path) -> None:
    dataset = load_dataset("squad", split=split)

    rows: list[dict[str, Any]] = []
    for index, sample in enumerate(dataset):
        sample_id = str(sample.get("id") or index)
        answer_texts, answer_starts = _normalize_answers(sample.get("answers"))

        reference_payload = {
            "id": sample_id,
            "answers": {
                "text": answer_texts,
                "answer_start": answer_starts,
            },
        }

        rows.append(
            {
                "id": sample_id,
                "title": str(sample.get("title") or ""),
                "context": str(sample.get("context") or ""),
                "question": str(sample.get("question") or ""),
                "answer_count": len(answer_texts),
                "is_answerable": len(answer_texts) > 0,
                "reference": json.dumps(reference_payload, ensure_ascii=False),
            }
        )

    df = pd.DataFrame(rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output_path, index=False)

    print("SQuAD dataset creation completed.")
    print(f"Rows: {len(df)} -> {output_path}")
    print(f"Answerable rows: {int(df['is_answerable'].sum())} / {len(df)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download and preprocess SQuAD dataset for extractive QA benchmarks"
    )
    parser.add_argument("--split", default="validation", help="HuggingFace split")
    parser.add_argument(
        "--output",
        default="datasets/squad/validation.parquet",
        help="Output parquet path relative to project root",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[2]
    output_path = (project_root / args.output).resolve()
    create_squad_dataset(split=args.split, output_path=output_path)


if __name__ == "__main__":
    main()
