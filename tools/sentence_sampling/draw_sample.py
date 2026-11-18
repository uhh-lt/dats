"""Draws the validation sample from a sentence export (see README.md for the strategy).

Draw 1 (background) samples the whole frame, Draw 2 (proxy) the sentences with a
proxy term but without "fresh", Draw 3 (fresh) the sentences with "fresh". Every
draw takes an equal number of sentences per decade and leaves out the sentences
of Draw 1. The sample CSV and a log JSON with everything needed to reproduce and
weight it are written next to the export.
"""

import argparse
import json
import platform
import re
from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger
from sampling_utils import sha256_of

DEFAULT_PROXY_TERMS = Path(__file__).parent / "proxy_terms.json"
DEFAULT_DECADES = [1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950]
FRESH_SUBSTRING = "fresh"
# a word is a whitespace-separated token with at least one letter
WORD_PATTERN = r"\S*[^\W\d_]\S*"
OUTPUT_COLUMNS = [
    "draw",
    "sentence_uid",
    "sdoc_id",
    "sentence_idx",
    "sdoc_filename",
    "year",
    "decade",
    "n_words",
    "contains_fresh",
    "matched_proxy_terms",
    "sentence_text",
]


def term_pattern(forms: list[str]) -> str:
    """A regex that matches any of the forms as whole words; the words of a
    multi-word form may be separated by whitespace or hyphens."""
    alternatives = [
        r"[\s-]+".join(re.escape(w) for w in form.split()) for form in forms
    ]
    return r"\b(?:" + "|".join(alternatives) + r")\b"


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


def mark_matches(df: pd.DataFrame, proxy_terms: dict[str, list[str]]) -> pd.DataFrame:
    """Adds contains_fresh (case-insensitive substring) and matched_proxy_terms (the
    list terms whose forms occur as whole words, case-insensitive, ';'-separated)."""
    text = df["sentence_text"]
    contains_fresh = text.str.contains(FRESH_SUBSTRING, case=False, regex=False)

    # match all terms at once, then find out which ones for the matching sentences only
    any_term = term_pattern([f for forms in proxy_terms.values() for f in forms])
    candidates = text[text.str.contains(any_term, case=False, regex=True)]
    matched = pd.Series("", index=df.index, dtype=object)
    for term, forms in proxy_terms.items():
        hits = candidates.str.contains(term_pattern(forms), case=False, regex=True)
        hit_index = hits[hits].index
        matched[hit_index] = matched[hit_index] + term + ";"
    return df.assign(
        contains_fresh=contains_fresh, matched_proxy_terms=matched.str.rstrip(";")
    )


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
) -> tuple[pd.DataFrame, dict[str, dict[str, int]]]:
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
        "pool_per_decade": {str(d): len(g) for d, g in groups.items()},
        "drawn_per_decade": {str(d): quotas[d] for d in decades},
    }
    logger.info(f"Draw '{name}': {len(sample)} of {len(pool)} sentences")
    return sample, log


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, required=True, help="the CSV of export_sentences.py"
    )
    parser.add_argument(
        "--seed", type=int, required=True, help="the seed of the draw, log it"
    )
    parser.add_argument("--proxy_terms", type=Path, default=DEFAULT_PROXY_TERMS)
    parser.add_argument(
        "--min_words",
        type=int,
        default=5,
        help="sentences with fewer words are not in the frame",
    )
    parser.add_argument("--decades", type=int, nargs="+", default=DEFAULT_DECADES)
    parser.add_argument("--n_background", type=int, default=100)
    parser.add_argument("--n_proxy", type=int, default=200)
    parser.add_argument("--n_fresh", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="defaults to data/sentence_sample_project_<project_id>.csv",
    )
    parser.add_argument(
        "--overwrite", action="store_true", help="replace an existing sample"
    )
    args = parser.parse_args()

    # the export must be the one its manifest describes
    manifest = json.loads(args.input.with_suffix(".manifest.json").read_text())
    input_sha256 = sha256_of(args.input)
    if input_sha256 != manifest["csv_sha256"]:
        raise SystemExit(f"{args.input} does not match the SHA-256 of its manifest")
    project_id = manifest["project_id"]

    output: Path = (
        args.output or args.input.parent / f"sentence_sample_project_{project_id}.csv"
    )
    log_path = output.with_suffix(".log.json")
    if output.exists() and not args.overwrite:
        raise SystemExit(f"{output} exists; pass --overwrite to draw again")

    proxy_terms: dict[str, list[str]] = json.loads(args.proxy_terms.read_text())
    decades = sorted(args.decades)

    frame, frame_counts = load_frame(args.input, decades, args.min_words)
    empty = [d for d in decades if not (frame["decade"] == d).any()]
    if empty:
        raise SystemExit(f"The frame has no sentences in the decades {empty}")
    frame = mark_matches(frame, proxy_terms)
    logger.info(f"Frame: {frame_counts}")

    rng_background, rng_proxy, rng_fresh = (
        np.random.default_rng(s) for s in np.random.SeedSequence(args.seed).spawn(3)
    )
    background, background_log = draw(
        "background", frame, args.n_background, decades, rng_background
    )
    rest = frame.drop(background.index)
    has_proxy = rest["matched_proxy_terms"] != ""
    # a sentence with "fresh" and a proxy term belongs to the fresh pool only
    proxy, proxy_log = draw(
        "proxy",
        rest[has_proxy & ~rest["contains_fresh"]],
        args.n_proxy,
        decades,
        rng_proxy,
    )
    fresh, fresh_log = draw(
        "fresh", rest[rest["contains_fresh"]], args.n_fresh, decades, rng_fresh
    )

    sample = pd.concat([background, proxy, fresh])[OUTPUT_COLUMNS]
    output.parent.mkdir(parents=True, exist_ok=True)
    sample.to_csv(output, index=False, lineterminator="\n")

    log = {
        "input_file": args.input.name,
        "input_sha256": input_sha256,
        "project_id": project_id,
        "proxy_terms_file": args.proxy_terms.name,
        "proxy_terms_sha256": sha256_of(args.proxy_terms),
        "proxy_terms": proxy_terms,
        "fresh_substring": FRESH_SUBSTRING,
        "seed": args.seed,
        "min_words": args.min_words,
        "decades": decades,
        "frame": {
            **frame_counts,
            "per_decade": {str(d): int((frame["decade"] == d).sum()) for d in decades},
        },
        "draws": {
            "background": {"n": args.n_background, **background_log},
            "proxy": {"n": args.n_proxy, **proxy_log},
            "fresh": {"n": args.n_fresh, **fresh_log},
        },
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
