from pydantic import BaseModel, Field


class InstanceInfo(BaseModel):
    is_oidc_enabled: bool = Field(description="Is OIDC enabled")
    oidc_provider_names: list[str] = Field(description="OIDC provider names")
    is_stable: bool = Field(description="Is stable")
    glitchtip_dsn: str | None = Field(description="Glitchtip DSN")
