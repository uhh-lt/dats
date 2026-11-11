from pydantic import BaseModel, Field

from common.feature_enum import Feature


class FeatureRead(BaseModel):
    feature: Feature = Field(description="ID of the Feature")
    requires_features: list[Feature] = Field(
        description="The Features this Feature requires (directly); enabling it enables them"
    )
