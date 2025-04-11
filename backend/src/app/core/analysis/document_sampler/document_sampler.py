from typing import List

import pandas as pd
from app.core.data.dto.analysis import (
    SampledSdocsResults,
)
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.db.sql_service import SQLService
from app.core.db.sql_utils import aggregate_ids
from sqlalchemy import and_, case, func


def document_sampler_by_tags(
    project_id: int, tag_ids: List[List[int]], n: int, frac: float
) -> List[SampledSdocsResults]:
    all_tag_ids = [tag_id for group in tag_ids for tag_id in group]
    tag2group = {tag_id: idx for idx, group in enumerate(tag_ids) for tag_id in group}

    with SQLService().db_session() as db:
        query = (
            db.query(SourceDocumentORM.id, aggregate_ids(DocumentTagORM.id, "tags"))
            .join(SourceDocumentORM.document_tags)
            .where(DocumentTagORM.id.in_(all_tag_ids))
            .group_by(SourceDocumentORM.id)
            # this having clause ensures that the document has one tag from each group
            .having(
                and_(
                    *[
                        func.sum(
                            case(
                                (DocumentTagORM.id.in_(group_ids), 1),
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

        data = []
        groups = set()
        for x in res:
            sdoc = x[0]
            tags = x[1]
            datum = {
                "sdoc": sdoc,
            }
            for tag_id in tags:
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

        result: List[SampledSdocsResults] = []
        for group in counts.keys():
            result.append(
                SampledSdocsResults(
                    tags=[group] if isinstance(group, int) else list(group),
                    sdocs=counts.get(group, []),
                    sample_fixed=sample_fixed.get(group, []),
                    sample_relative=sample_relative.get(group, []),
                )
            )
        return result
