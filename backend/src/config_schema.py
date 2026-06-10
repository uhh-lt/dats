from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    port: int = Field(gt=0, lt=65536)
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

    def model_validator(cls, values: Any) -> Any:
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
    oidc: OidcConfig


class PersonConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    email: str = Field(min_length=1)
    password: str = Field(min_length=1)


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

    root_directory: Path = Field(min_length=1)
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
    password: str = Field(min_length=1)
    batch_size: int = Field(gt=0)
    pool: PostgresPoolConfig


class MailConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool
    mail: str
    user: str
    password: str
    server: str
    port: int
    starttls: bool
    ssl_tls: bool
    use_credentials: bool
    validate_certs: bool

    def model_validator(cls, values: Any) -> Any:
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
                if not value or (isinstance(value, str) and not value.strip()):
                    raise ValueError(
                        f"Field '{field}' is required when mail is enabled."
                    )


class RedisConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    password: str = Field(min_length=1)
    rq_idx: int = Field(ge=0)


class LoggingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    max_file_size: int = Field(gt=0)
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


class ModelServerConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)
    model: str = Field(min_length=1)


class VllmConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    llm: ModelServerConfig
    vlm: ModelServerConfig
    emb: ModelServerConfig


class DoclingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = Field(min_length=1)
    port: int = Field(gt=0, lt=65536)


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
    vllm: VllmConfig
    docling: DoclingConfig
    rq: RqConfig
    llm_assistant: LlmAssistantConfig
    cota: CotaConfig
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
