from __future__ import annotations

from itertools import repeat
from pathlib import Path
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)

from common.doc_type import DocType
from common.meta_type import MetaType


def _normalize_project_metadata(project_metadata: Any) -> Any:
    if isinstance(project_metadata, dict):
        return [
            {"name": name, **metadata} for name, metadata in project_metadata.items()
        ]

    return project_metadata


def _normalize_system_code_entry(name: str, entry: Any) -> Any:
    if not isinstance(entry, dict):
        return entry

    normalized_entry = dict(entry)
    normalized_entry.setdefault("name", name)

    children = normalized_entry.get("children")
    if isinstance(children, dict):
        normalized_entry["children"] = [
            _normalize_system_code_entry(child_name, child_entry)
            for child_name, child_entry in children.items()
        ]

    return normalized_entry


def _normalize_system_codes(system_codes: Any) -> Any:
    if isinstance(system_codes, dict):
        return [
            _normalize_system_code_entry(code_name, code_entry)
            for code_name, code_entry in system_codes.items()
        ]

    return system_codes


class ProjectMetadataConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    key: str = Field(min_length=1)
    metatype: MetaType
    read_only: bool = False
    doctype: DocType
    description: str = Field(min_length=1)


class SystemCodeConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    desc: str = Field(min_length=1)
    enabled: bool = True
    children: list[SystemCodeConfig] = Field(default_factory=list)


class ApiConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str = Field(min_length=1)
    max_upload_file_size: int = Field(gt=0)
    production_mode: int = Field(ge=0, le=1)
    is_stable: bool
    uuid_namespace: str = Field(min_length=1)
    hf_hub_token: str = Field(min_length=1)


class JwtConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token_url: str = Field(min_length=1)
    access_ttl: int = Field(gt=0)
    refresh_ttl: int = Field(gt=0)
    algo: str = Field(min_length=1)
    secret: str = Field(min_length=1)


class SessionConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    secret: str = Field(min_length=1)


class OidcConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool
    name: str
    client_id: str
    client_secret: str
    server_metadata_url: str

    def model_validator(self, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        if values.get("enabled"):
            required_fields = [
                "name",
                "client_id",
                "client_secret",
                "server_metadata_url",
            ]
            for field in required_fields:
                value = values.get(field)
                if not value or (isinstance(value, str) and not value.strip()):
                    raise ValueError(
                        f"Field '{field}' is required when OIDC is enabled."
                    )

        return values


class AuthConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jwt: JwtConfig
    session: SessionConfig
    oidc: list[OidcConfig]

    @field_validator("oidc", mode="before")
    @classmethod
    def transform(cls, value: dict) -> list[OidcConfig]:
        # transforms the environemnt variables for OIDC configuration
        # from comma-separeted lists into list of objects
        split = {k: v.split(",") for k, v in value.items()}
        tmp = list(zip(repeat(split.keys()), *split.values()))
        result = [OidcConfig(**{k: v for k, v in zip(x[0], x[1:])}) for x in tmp]
        return result


class PersonConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    email: str = Field(min_length=1)
    password: SecretStr = Field(min_length=1)


class RayConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    protocol: str = Field(min_length=1)
    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)


class ContentServerConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    https: bool
    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    context_path: str = Field(min_length=1)


class FilesystemConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    root_directory: Path = Field()
    content_server: ContentServerConfig


class WeaviateConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    collection_postfix: str
    grpc_port: int = Field(gt=0, lt=65536)


class PostgresPoolConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pool_size: int = Field(gt=0)
    max_overflow: int = Field(ge=0)


class PostgresConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    db: str = Field(min_length=1)
    user: str = Field(min_length=1)
    password: SecretStr = Field(min_length=1)
    batch_size: int = Field(gt=0)
    pool: PostgresPoolConfig


class MailConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool
    mail: str
    user: str
    password: SecretStr
    server: str
    port: int
    starttls: bool
    ssl_tls: bool
    use_credentials: bool
    validate_certs: bool

    def model_validator(self, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        if values.get("enabled"):
            required_fields = [
                "mail",
                "user",
                "password",
                "server",
                "port",
                "starttls",
                "ssl_tls",
                "use_credentials",
                "validate_certs",
            ]
            for field in required_fields:
                value = values.get(field)
                if (
                    not value
                    or (
                        (isinstance(value, SecretStr))
                        and not value.get_secret_value().strip()
                    )
                    or (isinstance(value, str) and not value.strip())
                ):
                    raise ValueError(
                        f"Field '{field}' is required when mail is enabled."
                    )


class RedisConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    password: SecretStr = Field(min_length=1)
    rq_idx: int = Field(ge=0)


class LoggingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    level: str = Field(min_length=1)


class ElasticsearchConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    index_prefix: str = Field(min_length=1)
    use_ssl: bool
    verify_certs: bool
    sniff_on_start: bool
    sniff_on_connection_fail: bool
    sniffer_timeout: int = Field(gt=0)


class APIConnectionConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    api_key: str = Field()


class DoclingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)


class GlitchtipConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dsn_backend: str = Field()
    dsn_frontend: str = Field()


class RqConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gpu_memory_limit: int = Field(gt=0)


class LlmAssistantConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    few_shot_threshold: int = Field(gt=0)


class CotaConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: str = Field(min_length=1)
    batch_size: int = Field(gt=0)


class BaseModelOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str = Field(min_length=1)
    label: str = Field(min_length=1)


class ClassifierTrainingParamsConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lora_enabled: bool
    lora_rank: int = Field(gt=0)
    lora_alpha: int = Field(gt=0)
    lora_dropout: float = Field(ge=0.0, lt=1.0)
    freeze_base_model: bool
    epochs: int = Field(gt=0)
    batch_size: int = Field(gt=0)
    early_stopping: bool
    early_stopping_patience: int = Field(ge=0)
    train_test_split: float = Field(gt=0.0, lt=1.0)
    base_learning_rate: float = Field(gt=0.0)
    head_learning_rate: float = Field(gt=0.0)
    warmup_fraction: float = Field(ge=0.0, lt=1.0)
    weight_decay: float = Field(ge=0.0, le=1.0)
    dropout: float = Field(ge=0.0, le=1.0)
    chunk_size: int = Field(gt=0)
    precision: Literal["32-true", "16-true", "16-mixed", "bf16-true", "bf16-mixed"]
    averaging: Literal["micro", "macro"]

    @model_validator(mode="after")
    def validate_lora_freezes_base_model(self) -> ClassifierTrainingParamsConfig:
        if self.lora_enabled and not self.freeze_base_model:
            raise ValueError("Enabled LoRA requires freeze_base_model")
        return self


class ClassifierConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weak_signal_threshold: float = Field(ge=0.0, le=1.0)
    strong_signal_threshold: float = Field(ge=0.0, le=1.0)
    transformer_models: list[BaseModelOption] = Field(default_factory=list)
    embedding_models: list[BaseModelOption] = Field(default_factory=list)
    training_params: ClassifierTrainingParamsConfig

    @field_validator("transformer_models", "embedding_models", mode="before")
    @classmethod
    def _parse_models(cls, value: Any) -> Any:
        # The model lists can be provided either as a list of objects (YAML default)
        # or as a comma-separated string of "value:label" pairs (ENV variable).
        if not isinstance(value, str):
            return value

        value = value.strip()
        if not value:
            return []

        options = []
        for item in value.split(","):
            item = item.strip()
            if not item:
                continue
            model_value, sep, label = item.partition(":")
            options.append(
                {
                    "value": model_value.strip(),
                    "label": label.strip() if sep else model_value.strip(),
                }
            )
        return options


class PromptEmbedderBranchConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: str = Field(min_length=1)
    max_seq_length: int = Field(gt=0)
    batch_size: int = Field(gt=0)


class PromptEmbedderConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: PromptEmbedderBranchConfig
    image: PromptEmbedderBranchConfig


class ChunkingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    characters_per_page: int = Field(gt=0)


class BackendConfigSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    api: ApiConfig
    auth: AuthConfig
    system_user: PersonConfig
    demo_user: PersonConfig
    assistant_user: PersonConfig
    ray: RayConfig
    filesystem: FilesystemConfig
    weaviate: WeaviateConfig
    postgres: PostgresConfig
    mail: MailConfig
    redis: RedisConfig
    logging: LoggingConfig
    elasticsearch: ElasticsearchConfig
    llm_provider: APIConnectionConfig
    emb_provider: APIConnectionConfig
    docling: DoclingConfig
    glitchtip: GlitchtipConfig
    rq: RqConfig
    llm_assistant: LlmAssistantConfig
    cota: CotaConfig
    classifier: ClassifierConfig
    promptembedder: PromptEmbedderConfig
    chunking: ChunkingConfig
    project_metadata: list[ProjectMetadataConfig]
    system_codes: list[SystemCodeConfig]

    @model_validator(mode="before")
    @classmethod
    def _normalize_input(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        normalized_values = dict(values)
        normalized_values["project_metadata"] = _normalize_project_metadata(
            normalized_values.get("project_metadata")
        )
        normalized_values["system_codes"] = _normalize_system_codes(
            normalized_values.get("system_codes")
        )
        return normalized_values
