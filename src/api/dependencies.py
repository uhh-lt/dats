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
