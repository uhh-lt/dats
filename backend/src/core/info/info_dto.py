from pydantic import BaseModel, Field


class InstanceInfo(BaseModel):
    is_oidc_enabled: bool = Field(description="Is OIDC enabled")
    oidc_provider_name: str = Field(description="OIDC provider name")
    is_stable: bool = Field(description="Is stable")
