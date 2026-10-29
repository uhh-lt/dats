"""Access to the data stores of a DATS instance, without importing DATS code.

The doctor only depends on what stays stable across DATS versions: the backend
config files and their environment variables, the database tables, the naming
of the Elasticsearch indices and Weaviate tenants, and the filesystem layout.
`verify_schema` checks the tables and columns before the doctor uses them, so
an incompatible DATS version fails early instead of half-way.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import weaviate
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from omegaconf import OmegaConf
from sqlalchemy import URL, Engine, create_engine, text
from weaviate import WeaviateClient

# SourceDocument status values (common/sdoc_status_enum.py)
STATUS_ERRONEOUS = -100
STATUS_PROCESSING = 0
STATUS_FINISHED = 1

# The processing steps per doctype; each is a status column of sourcedocument
# (common/doc_processing_steps.py)
_TEXT_STEPS = [
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
]
PROCESSING_STEPS: dict[str, list[str]] = {
    "text": ["extract_html", *_TEXT_STEPS],
    "image": [
        "image_caption",
        "image_embedding",
        "image_metadata_extraction",
        "image_thumbnail",
        "image_object_detection",
        *_TEXT_STEPS,
    ],
    "audio": ["audio_metadata", "audio_thumbnail", "audio_transcription", *_TEXT_STEPS],
    "video": [
        "video_metadata",
        "video_thumbnail",
        "video_audio_extraction",
        "audio_transcription",
        *_TEXT_STEPS,
    ],
}
ALL_STEPS = sorted({step for steps in PROCESSING_STEPS.values() for step in steps})

# The Weaviate collections (the `name` of the *_collection.py classes) and
# whether their objects carry the sdoc_id property
SDOC_COLLECTIONS = ["Document", "Sentence", "Image", "Aspect"]
ALL_COLLECTIONS = [*SDOC_COLLECTIONS, "Cluster"]

# The annotation tables by kind
AnnotationKind = Literal["span", "sentence", "bbox"]
ANNOTATION_TABLES: dict[AnnotationKind, str] = {
    "span": "spanannotation",
    "sentence": "sentenceannotation",
    "bbox": "bboxannotation",
}

# The text columns heal may set (SetValues), as the report can be edited by hand
SETTABLE_COLUMNS: dict[str, set[str]] = {
    "memo": {"title", "content_json"},
    "whiteboard": {"title"},
    "timelineanalysis": {"name"},
    "conceptovertimeanalysis": {"name"},
    "projectmetadata": {"key", "description"},
    "code": {"name", "description"},
    "tag": {"name", "description"},
    "folder": {"name"},
    "sourcedocumentdata": {"html", "raw_html"},
}

# The values pandas.read_csv turns into NaN (pandas._libs.parsers.STR_NA_VALUES):
# the project import reads them back as missing values
CSV_NA_VALUES = frozenset(
    {
        "",
        "#N/A",
        "#N/A N/A",
        "#NA",
        "-1.#IND",
        "-1.#QNAN",
        "-NaN",
        "-nan",
        "1.#IND",
        "1.#QNAN",
        "<NA>",
        "N/A",
        "NA",
        "NULL",
        "NaN",
        "None",
        "n/a",
        "nan",
        "null",
    }
)

# The filename limits of the uploaded files (core/doc/source_document_dto.py)
_SDOC_FILENAME_MAX_LENGTH = 200
_SDOC_SUFFIX_MAX_LENGTH = 30

# The tables and columns the doctor reads or writes
REQUIRED_COLUMNS: dict[str, list[str]] = {
    "project": ["id"],
    "user": ["id"],
    "projectuserlinktable": ["project_id", "user_id"],
    "sourcedocument": [
        "id",
        "filename",
        "doctype",
        "project_id",
        "folder_id",
        "created",
        *ALL_STEPS,
    ],
    "sourcedocumentdata": [
        "id",
        "content",
        "html",
        "raw_html",
        "token_starts",
        "sentence_starts",
    ],
    "annotationdocument": ["id", "source_document_id", "user_id", "updated"],
    "spanannotation": [
        "id",
        "begin",
        "end",
        "begin_token",
        "end_token",
        "span_text_id",
        "project_id",
        "code_id",
        "annotation_document_id",
    ],
    "spantext": ["id", "text"],
    "sentenceannotation": [
        "id",
        "sentence_id_start",
        "sentence_id_end",
        "project_id",
        "code_id",
        "annotation_document_id",
    ],
    "bboxannotation": [
        "id",
        "x_min",
        "x_max",
        "y_min",
        "y_max",
        "project_id",
        "code_id",
        "annotation_document_id",
    ],
    "code": ["id", "name", "description", "parent_id", "is_system", "project_id"],
    "folder": ["id", "name", "project_id", "folder_type", "parent_id"],
    "tag": ["id", "name", "description", "parent_id", "project_id"],
    "sourcedocumenttaglinktable": ["source_document_id", "tag_id"],
    "projectmetadata": [
        "id",
        "key",
        "description",
        "doctype",
        "metatype",
        "project_id",
    ],
    "sourcedocumentmetadata": [
        "id",
        "source_document_id",
        "project_metadata_id",
        "str_value",
        "int_value",
        "boolean_value",
        "date_value",
        "list_value",
    ],
    "memo": ["id", "title", "content_json", "user_id", "attached_to_id", "project_id"],
    "memofavoritelinktable": ["memo_id", "user_id"],
    "objecthandle": ["id", "project_id", "span_group_id", "user_id", "memo_id"],
    "whiteboard": ["id", "title", "content", "project_id"],
    "timelineanalysis": ["id", "name", "concepts", "project_id"],
    "conceptovertimeanalysis": ["id", "name", "project_id"],
}


class UnsupportedSchemaError(Exception):
    pass


@dataclass
class Stores:
    db: Engine
    es: Elasticsearch
    weaviate: WeaviateClient
    root_dir: Path
    index_prefix: str
    collection_postfix: str
    system_code_parents: dict[str, str | None]
    config_metadata: dict[tuple[str, str], str]

    # ==========================================================================
    # NAMING
    # ==========================================================================
    @property
    def projects_dir(self) -> Path:
        return self.root_dir / "projects"

    def docs_dir(self, project_id: int) -> Path:
        return self.projects_dir / str(project_id) / "docs"

    def index_name(self, project_id: int) -> str:
        return f"{self.index_prefix}_project_{project_id}_docs"

    def collection_name(self, name: str) -> str:
        return f"{name}{self.collection_postfix}"

    @staticmethod
    def tenant_name(project_id: int) -> str:
        return f"Project{project_id}"

    @staticmethod
    def truncate_filename(filename: str) -> str:
        """The name under which DATS stores an uploaded file
        (FilesystemRepo.truncate_filename)."""
        path = Path(filename)
        if len(path.name) <= _SDOC_FILENAME_MAX_LENGTH + _SDOC_SUFFIX_MAX_LENGTH:
            return str(path)
        suffix = "".join(path.suffixes[-3:])[-_SDOC_SUFFIX_MAX_LENGTH:]
        return str(
            path.with_name(
                path.name.removesuffix(suffix)[:_SDOC_FILENAME_MAX_LENGTH]
            ).with_suffix(suffix)
        )

    def owned_filenames(self, filename: str, doctype: str) -> set[str]:
        """The files in the docs folder that belong to a document: the original,
        and the files the processing derives from it
        (FilesystemRepo.generate_sdoc_filename)."""
        name = self.truncate_filename(filename)
        owned = {name}
        if doctype in ("image", "audio", "video"):
            path = Path(name)
            owned |= {
                f"{name}.webp",
                f"{name}.thumbnail.webp",
                f"{path.stem}.thumbnail{path.suffix}",
            }
        if doctype == "video":
            # the audio stream extracted for the transcription
            owned.add(Path(name).with_suffix(".mp3").name)
        return owned

    # ==========================================================================
    # LIFECYCLE
    # ==========================================================================
    def close(self) -> None:
        self.weaviate.close()
        self.es.close()
        self.db.dispose()

    def schema_revision(self) -> str:
        with self.db.connect() as conn:
            return str(
                conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            )

    def verify_schema(self) -> None:
        """Raises if a table or column the doctor uses does not exist."""
        with self.db.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT table_name, column_name FROM information_schema.columns "
                    "WHERE table_schema = current_schema()"
                )
            ).all()
        existing = {(table, column) for table, column in rows}
        missing = [
            f"{table}.{column}"
            for table, columns in REQUIRED_COLUMNS.items()
            for column in columns
            if (table, column) not in existing
        ]
        if missing:
            raise UnsupportedSchemaError(
                "This DATS version is not supported by the doctor: the database "
                f"(revision {self.schema_revision()}) lacks {', '.join(missing)}"
            )


def _bool(value: Any) -> bool:
    """Environment values arrive as strings ("False"), which config_schema.py
    converts with pydantic."""
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def _system_code_parents(
    codes: Any, parent: str | None = None
) -> dict[str, str | None]:
    """The names of the system codes every project gets (config system_codes,
    nested via `children`), mapped to the names of their parents."""
    parents: dict[str, str | None] = {}
    for name, code in codes.items():
        parents[str(name)] = parent
        if "children" in code and code.children:
            parents |= _system_code_parents(code.children, str(name))
    return parents


def _load_config(backend_dir: Path) -> Any:
    """Loads the backend config like backend/src/config.py does (without the
    validation of the DATS version at hand)."""
    env_file = backend_dir / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    config_dir = backend_dir / "configs"
    return OmegaConf.merge(
        OmegaConf.load(config_dir / "base.yaml"),
        OmegaConf.load(config_dir / "default.yaml"),
    )


def connect() -> Stores:
    """Connects to the data stores configured for the backend in
    $DATS_BACKEND_DIR (set by dats-doctor.sh)."""
    backend_dir = Path(os.environ["DATS_BACKEND_DIR"])
    conf = _load_config(backend_dir)

    root_dir = Path(conf.filesystem.root_directory)
    if not root_dir.is_absolute():
        # relative to the repository root, like in config.py
        root_dir = (backend_dir.parent / root_dir).resolve()

    pg = conf.postgres
    db = create_engine(
        URL.create(
            "postgresql",
            username=str(pg.user),
            password=str(pg.password),
            host=str(pg.host),
            port=int(pg.port),
            database=str(pg.db),
        )
    )

    es_conf = conf.elasticsearch
    es = Elasticsearch(
        [{"host": str(es_conf.host), "port": int(es_conf.port)}],
        use_ssl=_bool(es_conf.use_ssl),
        verify_certs=_bool(es_conf.verify_certs),
        retry_on_timeout=True,
    )
    if not es.ping():
        raise ConnectionError(
            f"Cannot reach Elasticsearch at {es_conf.host}:{es_conf.port}"
        )

    wv = conf.weaviate
    weaviate_client = weaviate.connect_to_custom(
        http_host=str(wv.host),
        http_port=int(wv.port),
        http_secure=False,
        grpc_host=str(wv.host),
        grpc_port=int(wv.grpc_port),
        grpc_secure=False,
    )

    stores = Stores(
        db=db,
        es=es,
        weaviate=weaviate_client,
        root_dir=root_dir,
        index_prefix=str(es_conf.index_prefix),
        collection_postfix=str(wv.collection_postfix),
        system_code_parents=_system_code_parents(conf.system_codes),
        config_metadata={
            (str(m.key), str(m.doctype)): str(m.metatype)
            for m in conf.project_metadata.values()
        },
    )
    try:
        stores.verify_schema()
    except Exception:
        stores.close()
        raise
    return stores
