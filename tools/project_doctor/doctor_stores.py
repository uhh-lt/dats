"""Access to the data stores of a DATS instance, without importing DATS code.

The doctor only depends on what stays stable across DATS versions: the backend
config files and their environment variables, the database tables, the naming
of the Elasticsearch indices and Weaviate tenants, and the filesystem layout.
`verify_schema` and `verify_file_layout` check the tables, columns and folders
before the doctor uses them, so an incompatible DATS version fails early
instead of half-way.
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

# The processing steps per doctype, in pipeline order
# (artefact_registry.graph().steps(doctype) of the backend), and the steps that
# write the embeddings of a Weaviate collection, the Elasticsearch index and the
# thumbnail of an image. A copy: the doctor imports no
# DATS code, so it runs on the released backend image; update it by hand when
# the pipeline changes.
#
# The status of a step is a row of sourcedocumentstepstatus (STEP_STATUS_TABLE),
# and a step without a row is not planned for the document (its feature is not
# enabled, or a core step was never computed for it, e.g. after an import).
_TEXT_STEPS = [
    "text_extraction",
    "document_embedding",
    "es_index",
    "language_detection",
    "keywords",
    "named_entity_recognition",
    "tokens_sentences",
    "coreference_resolution",
    "html_mapping",
    "quotation_detection",
    "sentence_embedding",
    "word_frequency",
]
PROCESSING_STEPS: dict[str, list[str]] = {
    "text": ["html_extraction", *_TEXT_STEPS],
    "image": [
        "image_caption",
        "image_embedding",
        "image_metadata_extraction",
        "image_thumbnail",
        "object_detection",
        *_TEXT_STEPS,
    ],
    "audio": [
        "audio_metadata_extraction",
        "audio_thumbnail",
        "transcription",
        *_TEXT_STEPS,
    ],
    "video": [
        "video_audio_extraction",
        "video_metadata_extraction",
        "video_thumbnail",
        "transcription",
        *_TEXT_STEPS,
    ],
}
EMBEDDING_STEPS = {
    "Document": "document_embedding",
    "Sentence": "sentence_embedding",
    "Image": "image_embedding",
}
ES_INDEX_STEP = "es_index"
IMAGE_THUMBNAIL_STEP = "image_thumbnail"
VIDEO_THUMBNAIL_STEP = "video_thumbnail"
VIDEO_AUDIO_STEP = "video_audio_extraction"
# The artefacts with their own store in the project export (the artefacts with
# an archive, backend/src/systems/artefact_system/artefact_registry.py) that the doctor does
# not check: the word frequencies.
UNCHECKED_STORES = ["word_frequencies"]

# The file store: one folder per entity, `projects/<project_id>/<folder>/<id>/`
# (the `folder` of the *_file_crud.py classes of the backend), mapped to the
# table whose ids name the subfolders (None: the files belong to no row, an
# export is kept for minutes). A copy, like the steps above.
ENTITY_FOLDERS: dict[str, str | None] = {
    "sdoc_files": "sourcedocument",
    "web_images": "sourcedocument",
    "thumbnails": "sourcedocument",
    "audio": "sourcedocument",
    "classifier_models": "classifier",
    "perspectives_models": "aspect",
    "perspectives_plots": "aspect",
    "exports": None,
}
# The uploaded file of a document, `sdoc_files/<sdoc_id>/<filename>`, and the
# files the processing derives from it, as (folder, file name)
SDOC_FILES_FOLDER = "sdoc_files"
WEB_IMAGE_FILE = ("web_images", "image.webp")
THUMBNAIL_FILE = ("thumbnails", "thumbnail.webp")
AUDIO_FILE = ("audio", "audio.mp3")
# The folders of the legacy layout, which the migration of the file store
# (807bab97f373_file_store) emptied into the entity folders and deleted, and the
# columns it dropped: a database that still has them has the legacy layout
LEGACY_DOCS_FOLDER = "docs"
LEGACY_FOLDERS = [LEGACY_DOCS_FOLDER, "models", "plots", "dataloaders"]
LEGACY_COLUMNS = [("classifier", "path"), ("sourcedocumentdata", "repo_url")]
STEP_STATUS_TABLE = "sourcedocumentstepstatus"

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

# The metadata keys a feature creates in its project when it is set up (enable,
# project creation, import), besides the configured project metadata: the
# keywords of Keyword Statistics (modules/keyword_statistics/keywords_artefact.py)
FEATURE_METADATA: dict[str, dict[tuple[str, str], str]] = {
    "keyword_statistics": {
        ("keywords", doctype): "LIST" for doctype in ("text", "image", "audio", "video")
    },
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

# The tables and columns the doctor reads or writes
REQUIRED_COLUMNS: dict[str, list[str]] = {
    "project": ["id", "enabled_features"],
    "user": ["id"],
    "projectuserlinktable": ["project_id", "user_id"],
    "sourcedocument": [
        "id",
        "filename",
        "doctype",
        "project_id",
        "folder_id",
        "created",
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
    "sourcedocumentstepstatus": ["sdoc_id", "step", "status"],
    "classifier": ["id", "project_id"],
    "aspect": ["id", "project_id"],
}


class UnsupportedSchemaError(Exception):
    """The database or the file layout of the DATS version is not the one the
    doctor knows."""


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

    def project_dir(self, project_id: int) -> Path:
        return self.projects_dir / str(project_id)

    def entity_dir(self, project_id: int, folder: str, entity_id: int) -> Path:
        """The folder of an entity's files in the file store."""
        return self.project_dir(project_id) / folder / str(entity_id)

    def index_name(self, project_id: int) -> str:
        return f"{self.index_prefix}_project_{project_id}_docs"

    def collection_name(self, name: str) -> str:
        return f"{name}{self.collection_postfix}"

    @staticmethod
    def tenant_name(project_id: int) -> str:
        return f"Project{project_id}"

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
        legacy = [f"{t}.{c}" for t, c in LEGACY_COLUMNS if (t, c) in existing]
        if legacy:
            raise UnsupportedSchemaError(
                "This DATS version is not supported by the doctor: the database "
                f"(revision {self.schema_revision()}) still has {', '.join(legacy)}, "
                "so its files lie in the legacy layout (docs/, models/, ...)"
            )

    def verify_file_layout(self) -> None:
        """Raises if a project folder holds an entry that is neither a folder of
        the file store nor a legacy folder (which check reports)."""
        if not self.projects_dir.is_dir():
            return
        known = {*ENTITY_FOLDERS, *LEGACY_FOLDERS}
        unknown = sorted(
            str(entry)
            for project_dir in self.projects_dir.iterdir()
            if project_dir.is_dir() and project_dir.name.isdigit()
            for entry in project_dir.iterdir()
            if entry.name not in known
        )
        if unknown:
            raise UnsupportedSchemaError(
                "This DATS version is not supported by the doctor: its file "
                f"layout has unknown entries {', '.join(unknown[:10])}"
                + (f", ... ({len(unknown) - 10} more)" if len(unknown) > 10 else "")
            )


def _bool(value: Any) -> bool:
    """Environment values arrive as strings ("False"), which config_schema.py
    converts with pydantic."""
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


# the doctor's copy of the system code trees the backend declares
SYSTEM_CODES_FILE = Path(__file__).parent / "system_codes.yaml"


def _system_code_parents(
    codes: Any, parent: str | None = None
) -> dict[str, str | None]:
    """The names of the system codes a project can have (`system_codes.yaml`,
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
        system_code_parents=_system_code_parents(
            OmegaConf.load(SYSTEM_CODES_FILE).system_codes
        ),
        config_metadata={
            (str(m.key), str(m.doctype)): str(m.metatype)
            for m in conf.project_metadata.values()
        },
    )
    try:
        stores.verify_schema()
        stores.verify_file_layout()
    except Exception:
        stores.close()
        raise
    return stores
