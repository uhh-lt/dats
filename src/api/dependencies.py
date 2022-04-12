from typing import Optional, Dict

from fastapi import Query


async def skip_limit_params(skip: Optional[int] = Query(title="Skip",
                                                        description="The maximum number of returned elements",
                                                        ge=0,
                                                        le=10e6,
                                                        default=0),
                            limit: Optional[int] = Query(title="Limit",
                                                         description="The number of elements to skip (offset)",
                                                         ge=1,
                                                         le=1000,
                                                         default=100)) -> Dict[str, int]:
    return {"skip": skip, "limit": limit}


async def resolve_code_param(resolve: Optional[bool] = Query(title="Resolve Code",
                                                             description="If true, the current_code_id of the"
                                                                         " SpanAnnotation gets resolved and replaced"
                                                                         " by the respective Code entity",
                                                             default=True)) -> bool:
    return resolve
