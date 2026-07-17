from typing import Set

import pandas as pd
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from modules.analysis.analysis_dto import SampledSdocsResults
from repos.db.sql_utils import aggregate_ids


def document_sampler_by_tags(
    db: Session, project_id: int, tag_ids: list[list[int]], n: int, frac: float
) -> list[SampledSdocsResults]:
    """Samples source documents based on combinations of tags from distinct tag groups.

    ### User Perspective & Concept:
    This feature allows users to extract representative, balanced samples of documents
    based on cross-cutting categories (variables).

    1. **What is a Group?**
       A group represents a metadata category or variable.
       For example:
       - Group 0 (Sentiment): [Tag "Positive", Tag "Negative", Tag "Neutral"]
       - Group 1 (Gender): [Tag "Male", Tag "Female"]

    2. **Mutually Exclusive Criteria**:
       A document is only considered if it has **exactly one tag** from each group.
       For example, a document must have exactly one Sentiment tag AND exactly one Gender tag.
       Documents with multiple tags from the same group (e.g., both Positive and Negative)
       or missing tags from any group are excluded.

    3. **Combinations**:
       All qualifying documents are partitioned into unique cross-category combinations:
       - (Positive, Male)
       - (Positive, Female)
       - (Negative, Male)
       - (Negative, Female)

    4. **Sampling Types**:
       - **Counts**: The total number of documents in each combination.
       - **Fixed size (sample_fixed)**: Samples up to `n` documents per combination.
         To ensure a balanced sample size across categories, the size is capped at
         the size of the smallest combination.
       - **Relative size (sample_relative)**: Samples a fraction (`frac`) of the total
         documents in each combination.

    Args:
        db: The SQLAlchemy database session.
        project_id: The ID of the project.
        tag_ids: A list of tag groups, where each group is represented as a list of tag IDs.
            Example: [[1, 2], [3, 4]] where group 0 has tags {1, 2} and group 1 has tags {3, 4}.
        n: The maximum number of documents to sample per tag combination for the fixed-size sample.
        frac: The fraction of documents (between 0.0 and 1.0) to sample per tag combination
            for the relative-size sample.

    Returns:
        A list of SampledSdocsResults containing:
            - tags: The specific tag combination (one ID from each group).
            - sdocs: All document IDs matching this combination.
            - sample_fixed: Sampled document IDs (fixed size).
            - sample_relative: Sampled document IDs (fractional/relative size).
    """
    all_tag_ids = [tag_id for group in tag_ids for tag_id in group]
    tag2group = {tag_id: idx for idx, group in enumerate(tag_ids) for tag_id in group}

    query = (
        db.query(SourceDocumentORM.id, aggregate_ids(TagORM.id, "tags"))
        .join(SourceDocumentORM.tags)
        .where(TagORM.id.in_(all_tag_ids))
        .group_by(SourceDocumentORM.id)
        # this having clause ensures that the document has one tag from each group
        .having(
            and_(
                *[
                    func.sum(
                        case(
                            (TagORM.id.in_(group_ids), 1),
                            else_=0,
                        )
                    )
                    == 1
                    for group_ids in tag_ids
                ]
            )
        )
    )
    res = query.all()
    if len(res) == 0:
        return []

    data: list[dict[str, int]] = []
    groups: Set[str] = set()
    for row in res:
        (sdoc, tags) = row.tuple()
        datum = {
            "sdoc": sdoc,
        }
        for tag_id in tags:
            if tag_id not in tag2group:
                continue
            group_id = tag2group[tag_id]
            datum[f"group_{group_id}"] = tag_id
            groups.add(f"group_{group_id}")
        data.append(datum)

    df = pd.DataFrame(data)
    counts = df.groupby(by=list(groups))["sdoc"].apply(list).to_dict()
    min_count = min([len(x) for x in counts.values()])
    sample_fixed = (
        df.groupby(by=list(groups))
        .sample(n=min(n, min_count))
        .groupby(by=list(groups))["sdoc"]  # type: ignore
        .apply(list)
        .to_dict()
    )
    sample_relative = (
        df.groupby(by=list(groups))
        .sample(frac=frac)
        .groupby(by=list(groups))["sdoc"]  # type: ignore
        .apply(list)
        .to_dict()
    )

    result: list[SampledSdocsResults] = []
    for group, sdocs in counts.items():
        if isinstance(group, int):
            group_tags = [group]
        elif isinstance(group, tuple):
            group_tags = list(group)
        else:
            raise RuntimeError(f"Unexpected group key type: {type(group)}")

        result.append(
            SampledSdocsResults(
                tags=group_tags,
                sdocs=sdocs,
                sample_fixed=sample_fixed.get(group, []),
                sample_relative=sample_relative.get(group, []),
            )
        )
    return result
