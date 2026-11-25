"""Draws a sentence sample from a sentence export (see README.md for the strategy).

The draws are defined by sample.json in the data folder: each draw takes n sentences
from its pool, an equal number per decade. A pool is the frame (sentences with a year
in one of the decades and at least min_words words), narrowed to the sentences that
match the draw's term list or substring, without those that match the draws it
excludes, and without the sentences of the earlier draws. The sample CSV and a log
JSON with everything needed to reproduce and weight it are written to the data folder.
"""

import argparse
import json
import platform
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from loguru import logger
from sampling_utils import DEFAULT_DATA_DIR, sha256_of

CONFIG_FILE = "sample.json"
# a word is a whitespace-separated token with at least one letter
WORD_PATTERN = r"\S*[^\W\d_]\S*"
DRAW_NAME_PATTERN = re.compile(r"[a-z][a-z0-9_]*")
SAMPLE_COLUMNS = [
    "draw",
    "sentence_uid",
    "sdoc_id",
    "sentence_idx",
    "sdoc_filename",
    "year",
    "decade",
    "n_words",
]


def term_pattern(forms: list[str]) -> str:
    """A regex that matches any of the forms as whole words; the words of a
    multi-word form may be separated by whitespace or hyphens."""
    alternatives = [
        r"[\s-]+".join(re.escape(w) for w in form.split()) for form in forms
    ]
    return r"\b(?:" + "|".join(alternatives) + r")\b"


def load_config(
    data_dir: Path,
) -> tuple[dict[str, Any], dict[str, dict[str, list[str]]]]:
    """Reads and checks sample.json and the term lists it names (relative to the data
    folder). Returns the config and the term lists by file name."""
    config_path = data_dir / CONFIG_FILE
    if not config_path.exists():
        raise SystemExit(
            f"{config_path} does not exist; copy the files of an example in examples/ "
            "into the data folder"
        )
    config: dict[str, Any] = json.loads(config_path.read_text())
    draws: list[dict[str, Any]] = config["draws"]
    names = [d["name"] for d in draws]
    if len(set(names)) != len(names):
        raise SystemExit(f"The draw names in {config_path} are not unique")
    criteria = {d["name"] for d in draws if "terms" in d or "substring" in d}
    term_lists: dict[str, dict[str, list[str]]] = {}
    for d in draws:
        if not DRAW_NAME_PATTERN.fullmatch(d["name"]):
            raise SystemExit(f"Draw names are lowercase identifiers, not '{d['name']}'")
        if not isinstance(d["n"], int) or d["n"] <= 0:
            raise SystemExit(f"Draw '{d['name']}' needs a positive n")
        if "terms" in d and "substring" in d:
            raise SystemExit(f"Draw '{d['name']}' has both terms and a substring")
        invalid = [
            e for e in d.get("exclude", []) if e == d["name"] or e not in criteria
        ]
        if invalid:
            raise SystemExit(
                f"Draw '{d['name']}' can only exclude other draws with terms or a "
                f"substring, not {invalid}"
            )
        if "terms" in d:
            term_lists[d["terms"]] = json.loads((data_dir / d["terms"]).read_text())
    return config, term_lists


def load_frame(
    path: Path, decades: list[int], min_words: int
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Reads the export and keeps the sentences of the frame: with a year in one of
    the decades and at least min_words words."""
    df = pd.read_csv(
        path,
        usecols=[
            "sentence_uid",
            "sdoc_id",
            "sentence_idx",
            "sdoc_filename",
            "year",
            "sentence_text",
        ],
        # Python strings, so that matching uses Python's re on every machine (the
        # pyarrow string type would use RE2, whose \b differs)
        dtype=object,
        keep_default_na=False,
    )
    counts = {"exported_sentences": len(df)}

    df = df[df["year"] != ""]
    counts["dropped_without_year"] = counts["exported_sentences"] - len(df)
    df = df.astype({"sdoc_id": int, "sentence_idx": int, "year": int})
    df["decade"] = df["year"] // 10 * 10

    n = len(df)
    df = df[df["decade"].isin(decades)]
    counts["dropped_outside_decades"] = n - len(df)

    n = len(df)
    df = df.assign(n_words=df["sentence_text"].str.count(WORD_PATTERN))
    df = df[df["n_words"] >= min_words]
    counts["dropped_too_short"] = n - len(df)

    counts["frame_sentences"] = len(df)
    df = df.sort_values(["sdoc_id", "sentence_idx"]).reset_index(drop=True)
    return df, counts


def match_terms(text: pd.Series, terms: dict[str, list[str]]) -> pd.Series:
    """The list terms whose forms occur as whole words (case-insensitive),
    ';'-separated, "" if none."""
    # match all terms at once, then find out which ones for the matching sentences only
    any_term = term_pattern([f for forms in terms.values() for f in forms])
    candidates = text[text.str.contains(any_term, case=False, regex=True)]
    matched = pd.Series("", index=text.index, dtype=object)
    for term, forms in terms.items():
        hits = candidates.str.contains(term_pattern(forms), case=False, regex=True)
        hit_index = hits[hits].index
        matched[hit_index] = matched[hit_index] + term + ";"
    return matched.str.rstrip(";")


def match_substring(text: pd.Series, substring: str) -> pd.Series:
    """The substring where it occurs (case-insensitive), "" elsewhere."""
    hits = text.str.contains(substring, case=False, regex=False)
    return hits.map({True: substring, False: ""})


def allocate(
    total: int, capacities: dict[int, int], rng: np.random.Generator
) -> dict[int, int]:
    """Splits total equally over the decades. A decade with fewer sentences than its
    share gives all of them; the rest goes equally to the other decades. What cannot
    be split equally goes, one each, to decades chosen at random."""
    if sum(capacities.values()) < total:
        raise SystemExit(
            f"Cannot draw {total} sentences from a pool of {sum(capacities.values())}"
        )
    quotas = dict.fromkeys(capacities, 0)
    remaining = total
    while remaining > 0:
        open_decades = sorted(d for d in capacities if quotas[d] < capacities[d])
        share = remaining // len(open_decades)
        if share == 0:
            for d in rng.choice(open_decades, size=remaining, replace=False):
                quotas[int(d)] += 1
            break
        for d in open_decades:
            added = min(share, capacities[d] - quotas[d])
            quotas[d] += added
            remaining -= added
    return quotas


def draw(
    name: str, pool: pd.DataFrame, n: int, decades: list[int], rng: np.random.Generator
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Draws n sentences of the pool, equally per decade, uniformly within a decade."""
    groups = {d: pool[pool["decade"] == d] for d in decades}
    quotas = allocate(n, {d: len(g) for d, g in groups.items()}, rng)
    drawn = []
    for d in decades:
        group = groups[d]
        positions = rng.choice(len(group), size=quotas[d], replace=False)
        drawn.append(group.iloc[np.sort(positions)])
    sample = pd.concat(drawn).assign(draw=name)
    log = {
        "n": n,
        "pool_per_decade": {str(d): len(g) for d, g in groups.items()},
        "drawn_per_decade": {str(d): quotas[d] for d in decades},
    }
    logger.info(f"Draw '{name}': {len(sample)} of {len(pool)} sentences")
    return sample, log


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data_dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="the folder with the export and sample.json, which receives the sample",
    )
    parser.add_argument("--project_id", type=int, required=True)
    parser.add_argument(
        "--seed", type=int, required=True, help="the seed of the draw, log it"
    )
    parser.add_argument(
        "--overwrite", action="store_true", help="replace an existing sample"
    )
    args = parser.parse_args()
    data_dir: Path = args.data_dir

    # the export must be the one its manifest describes
    export_path = data_dir / f"sentence_export_project_{args.project_id}.csv"
    manifest = json.loads(export_path.with_suffix(".manifest.json").read_text())
    export_sha256 = sha256_of(export_path)
    if export_sha256 != manifest["csv_sha256"]:
        raise SystemExit(f"{export_path} does not match the SHA-256 of its manifest")

    output = data_dir / f"sentence_sample_project_{args.project_id}.csv"
    log_path = output.with_suffix(".log.json")
    if output.exists() and not args.overwrite:
        raise SystemExit(f"{output} exists; pass --overwrite to draw again")

    config, term_lists = load_config(data_dir)
    decades = sorted(config["decades"])
    draws: list[dict[str, Any]] = config["draws"]

    frame, frame_counts = load_frame(export_path, decades, config["min_words"])
    empty = [d for d in decades if not (frame["decade"] == d).any()]
    if empty:
        raise SystemExit(f"The frame has no sentences in the decades {empty}")
    logger.info(f"Frame: {frame_counts}")

    # one column per draw with a criterion: what of it the sentence matches
    match_columns = []
    for d in draws:
        column = f"matches_{d['name']}"
        if "terms" in d:
            frame[column] = match_terms(frame["sentence_text"], term_lists[d["terms"]])
        elif "substring" in d:
            frame[column] = match_substring(frame["sentence_text"], d["substring"])
        else:
            continue
        match_columns.append(column)

    # one random generator per draw, in the order of the draws
    rngs = [
        np.random.default_rng(s)
        for s in np.random.SeedSequence(args.seed).spawn(len(draws))
    ]
    samples = []
    draws_log = {}
    rest = frame
    for d, rng in zip(draws, rngs):
        pool = rest
        if f"matches_{d['name']}" in match_columns:
            pool = pool[pool[f"matches_{d['name']}"] != ""]
        for excluded in d.get("exclude", []):
            pool = pool[pool[f"matches_{excluded}"] == ""]
        sample, draws_log[d["name"]] = draw(d["name"], pool, d["n"], decades, rng)
        samples.append(sample)
        # a sentence is drawn at most once
        rest = rest.drop(sample.index)

    sample = pd.concat(samples)[SAMPLE_COLUMNS + match_columns + ["sentence_text"]]
    data_dir.mkdir(parents=True, exist_ok=True)
    sample.to_csv(output, index=False, lineterminator="\n")

    log = {
        "export_file": export_path.name,
        "export_sha256": export_sha256,
        "project_id": args.project_id,
        "config_file": CONFIG_FILE,
        "config_sha256": sha256_of(data_dir / CONFIG_FILE),
        "config": config,
        "term_files": {
            name: {"sha256": sha256_of(data_dir / name), "terms": terms}
            for name, terms in term_lists.items()
        },
        "seed": args.seed,
        "frame": {
            **frame_counts,
            "per_decade": {str(d): int((frame["decade"] == d).sum()) for d in decades},
        },
        "draws": draws_log,
        "sample_file": output.name,
        "sample_sha256": sha256_of(output),
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
    }
    log_path.write_text(json.dumps(log, indent=2) + "\n", encoding="utf-8")
    logger.info(f"Wrote {len(sample)} sentences to {output} and the log to {log_path}")


if __name__ == "__main__":
    main()
