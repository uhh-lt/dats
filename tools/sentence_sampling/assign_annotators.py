"""Assigns the drawn sentences to annotator pairs (see README.md for the strategy).

Every pair of annotators gets one block of sentences, so every sentence is annotated
by exactly two people and everybody works with everybody exactly once. Every block
holds the same number of sentences of each draw in random order, and the sentences
are numbered block by block. The script writes the assignment, a DATS import file
that marks every sentence with the code SELECTED for both of its annotators, and a
log. It first checks in DATS that the code exists and that the annotators are
members of the project.
"""

import argparse
import itertools
import json
import platform
import uuid
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from loguru import logger
from sampling_utils import DEFAULT_DATA_DIR, connect, sha256_of

DEFAULT_CODE_NAME = "SELECTED"
# fixed, so that the same assignment always gives the same annotation UUIDs
UUID_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "dats/tools/sentence_sampling")
ASSIGNMENT_COLUMNS = [
    "number",
    "block",
    "annotator_1",
    "annotator_2",
    "draw",
    "sentence_uid",
    "sdoc_id",
    "sentence_idx",
    "sdoc_filename",
    "year",
    "decade",
    "sentence_text",
]
IMPORT_COLUMNS = [
    "uuid",
    "sdoc_name",
    "user_email",
    "code_name",
    "text_begin_sent",
    "text_end_sent",
    "text",
]


def load_annotators(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise SystemExit(
            f"{path} does not exist; copy annotators.example.json there and fill in "
            "the DATS emails"
        )
    annotators: list[dict[str, str]] = json.loads(path.read_text())
    for key in ("name", "email"):
        values = [a[key] for a in annotators]
        if len(set(values)) != len(values):
            raise SystemExit(f"The annotators in {path} have duplicate {key}s")
    placeholders = [a["name"] for a in annotators if a["email"].startswith("REPLACE")]
    if placeholders:
        raise SystemExit(
            f"Fill in the DATS emails of {', '.join(placeholders)} in {path}"
        )
    return annotators


def check_dats(
    backend_url: str,
    username: str,
    project_id: int,
    code_name: str,
    annotators: list[dict[str, str]],
) -> None:
    """Stops unless the code exists and every annotator is a member of the project,
    which the DATS import of the annotations needs."""
    api = connect(backend_url, username)
    code_names = {code["name"] for code in api.read_project_codes(project_id)}
    if code_name not in code_names:
        raise SystemExit(
            f"WARNING: the code '{code_name}' does not exist in project {project_id}. "
            "Create it in DATS first: the import marks every drawn sentence with it."
        )
    member_emails = {user["email"] for user in api.read_project_users(project_id)}
    missing = [a["name"] for a in annotators if a["email"] not in member_emails]
    if missing:
        raise SystemExit(
            f"WARNING: not members of project {project_id} (or wrong emails): "
            f"{', '.join(missing)}. Add them in DATS first."
        )
    logger.info(f"Code '{code_name}' and all annotators exist in project {project_id}")


def build_blocks(
    sample: pd.DataFrame, draws: list[str], n_blocks: int, rng: np.random.Generator
) -> pd.DataFrame:
    """Splits every draw at random into n_blocks equal parts, gives part b of every
    draw to block b, shuffles every block and numbers the sentences block by block."""
    parts = []
    for draw in draws:
        rows = sample[sample["draw"] == draw]
        if len(rows) % n_blocks != 0:
            raise SystemExit(
                f"The {len(rows)} sentences of the draw '{draw}' cannot be split "
                f"into {n_blocks} equal blocks"
            )
        shuffled = rows.iloc[rng.permutation(len(rows))]
        blocks = np.repeat(np.arange(1, n_blocks + 1), len(rows) // n_blocks)
        parts.append(shuffled.assign(block=blocks))
    by_block = pd.concat(parts)
    ordered = []
    for block in range(1, n_blocks + 1):
        rows = by_block[by_block["block"] == block]
        ordered.append(rows.iloc[rng.permutation(len(rows))])
    result = pd.concat(ordered).reset_index(drop=True)
    return result.assign(number=np.arange(1, len(result) + 1))


def number_ranges(numbers: list[int]) -> str:
    """'1-40, 81-160' for the numbers 1..40 and 81..160."""
    ranges = []
    for _, group in itertools.groupby(
        enumerate(sorted(numbers)), lambda x: x[1] - x[0]
    ):
        run = [n for _, n in group]
        ranges.append(f"{run[0]}-{run[-1]}")
    return ", ".join(ranges)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data_dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="the folder with the sample and annotators.json, which receives the "
        "assignment",
    )
    parser.add_argument("--project_id", type=int, required=True)
    parser.add_argument(
        "--seed", type=int, required=True, help="the seed of the assignment, log it"
    )
    parser.add_argument("--code_name", default=DEFAULT_CODE_NAME)
    parser.add_argument(
        "--backend_url",
        required=True,
        help="the API URL, e.g. https://dats.example.org/api/",
    )
    parser.add_argument("--username", required=True)
    parser.add_argument(
        "--overwrite", action="store_true", help="replace an existing assignment"
    )
    args = parser.parse_args()

    # the sample must be the one its log describes
    data_dir: Path = args.data_dir
    project_id: int = args.project_id
    sample_path = data_dir / f"sentence_sample_project_{project_id}.csv"
    sample_log = json.loads(sample_path.with_suffix(".log.json").read_text())
    input_sha256 = sha256_of(sample_path)
    if input_sha256 != sample_log["sample_sha256"]:
        raise SystemExit(f"{sample_path} does not match the SHA-256 of its log")
    # the draws in their order
    draws = list(sample_log["draws"])

    assignment_path = data_dir / f"assignment_project_{project_id}.csv"
    import_path = data_dir / f"selected_sentence_annotations_project_{project_id}.csv"
    log_path = assignment_path.with_suffix(".log.json")
    if not args.overwrite and (assignment_path.exists() or import_path.exists()):
        raise SystemExit(f"{assignment_path} exists; pass --overwrite to assign again")

    annotators = load_annotators(data_dir / "annotators.json")
    pairs = list(itertools.combinations(annotators, 2))
    check_dats(args.backend_url, args.username, project_id, args.code_name, annotators)

    sample = pd.read_csv(sample_path, keep_default_na=False)
    assignment = build_blocks(
        sample, draws, len(pairs), np.random.default_rng(args.seed)
    )
    assignment["annotator_1"] = [pairs[b - 1][0]["name"] for b in assignment["block"]]
    assignment["annotator_2"] = [pairs[b - 1][1]["name"] for b in assignment["block"]]
    assignment = assignment[ASSIGNMENT_COLUMNS]

    email_by_name = {a["name"]: a["email"] for a in annotators}
    import_rows: list[dict[str, Any]] = []
    for row in assignment.itertuples():
        for name in (row.annotator_1, row.annotator_2):
            email = email_by_name[name]
            import_rows.append(
                {
                    "uuid": str(
                        uuid.uuid5(
                            UUID_NAMESPACE,
                            f"{project_id}:{args.code_name}:{row.sentence_uid}:{email}",
                        )
                    ),
                    "sdoc_name": row.sdoc_filename,
                    "user_email": email,
                    "code_name": args.code_name,
                    "text_begin_sent": row.sentence_idx,
                    "text_end_sent": row.sentence_idx,
                    "text": row.sentence_text,
                }
            )

    assignment.to_csv(assignment_path, index=False, lineterminator="\n")
    pd.DataFrame(import_rows, columns=IMPORT_COLUMNS).to_csv(
        import_path, index=False, lineterminator="\n"
    )

    blocks_log = []
    for block, (first, second) in enumerate(pairs, start=1):
        rows = assignment[assignment["block"] == block]
        blocks_log.append(
            {
                "block": block,
                "numbers": number_ranges(rows["number"].tolist()),
                "annotators": [first["name"], second["name"]],
                "per_draw": {d: int((rows["draw"] == d).sum()) for d in draws},
            }
        )
    annotators_log = {}
    for annotator in annotators:
        name = annotator["name"]
        rows = assignment[
            (assignment["annotator_1"] == name) | (assignment["annotator_2"] == name)
        ]
        annotators_log[name] = {
            "email": annotator["email"],
            "blocks": sorted(rows["block"].unique().tolist()),
            "numbers": number_ranges(rows["number"].tolist()),
            "n_sentences": len(rows),
        }
        logger.info(
            f"{name}: sentences {annotators_log[name]['numbers']} ({len(rows)})"
        )

    log = {
        "input_file": sample_path.name,
        "input_sha256": input_sha256,
        "project_id": project_id,
        "seed": args.seed,
        "code_name": args.code_name,
        "blocks": blocks_log,
        "annotators": annotators_log,
        "assignment_file": assignment_path.name,
        "assignment_sha256": sha256_of(assignment_path),
        "import_file": import_path.name,
        "import_sha256": sha256_of(import_path),
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
    }
    log_path.write_text(json.dumps(log, indent=2) + "\n", encoding="utf-8")
    logger.info(
        f"Wrote {len(assignment)} sentences to {assignment_path}, "
        f"{len(import_rows)} annotations to {import_path} and the log to {log_path}"
    )


if __name__ == "__main__":
    main()
