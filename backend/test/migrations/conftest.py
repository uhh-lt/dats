import json
from collections.abc import Generator
from pathlib import Path
from typing import Callable, TypedDict
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from composite_keys_test_utils import FILLED_TABLES, create_two_tenants
from config import conf
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.system_codes import SystemCode
from core.project.project_orm import ProjectORM
from core.user.user_crud import SYSTEM_USER_ID
from core.user.user_orm import UserORM
from dats_test_utils import ProjectWithSdoc

# The pipeline steps per doctype before migration 448579029394; their status
# columns were NOT NULL with default 0, and there were no other step columns.
_HTML_STEPS = [
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
]
OLD_STEPS_BY_DOCTYPE = {
    DocType.text: ["extract_html", *_HTML_STEPS],
    DocType.image: [
        "image_caption",
        "image_embedding",
        "image_metadata_extraction",
        "image_thumbnail",
        "image_object_detection",
        *_HTML_STEPS,
    ],
    DocType.audio: [
        "audio_metadata",
        "audio_thumbnail",
        "audio_transcription",
        *_HTML_STEPS,
    ],
    DocType.video: [
        "video_metadata",
        "video_thumbnail",
        "video_audio_extraction",
        "audio_transcription",
        *_HTML_STEPS,
    ],
}
OLD_STATUS_COLUMNS = list(
    dict.fromkeys(c for steps in OLD_STEPS_BY_DOCTYPE.values() for c in steps)
)
BEFORE_STEP_STATUS = "d7f4aa3e7395"
# sourcedocumentjobstatus types and statuses
ML_COREFERENCE = 101
ML_DOCUMENT_EMBEDDING = 102
ML_SENTENCE_EMBEDDING = 103
ML_FINISHED = 3
ML_ERROR = 4


def alembic_config() -> Config:
    config = Config(str(Path(__file__).parents[2] / "src/migrations/alembic.ini"))
    config.attributes["configure_logger"] = False
    return config


# the file store, which has no downgrade, and the revision before it
FILE_STORE = "807bab97f373"
RENAME_STEPS = "10b8dac1fdd6"


def downgrade_from_head(db: Session, config: Config, revision: str) -> None:
    """Migrates the database from head down to `revision`. The file store
    cannot be downgraded: its dropped columns are added again (empty) and the
    revision before it is stamped instead."""
    db.commit()
    command.downgrade(config, FILE_STORE)
    db.execute(
        sa.text("ALTER TABLE classifier ADD COLUMN path VARCHAR NOT NULL DEFAULT ''")
    )
    db.execute(
        sa.text(
            "ALTER TABLE sourcedocumentdata "
            "ADD COLUMN repo_url VARCHAR NOT NULL DEFAULT ''"
        )
    )
    db.commit()
    command.stamp(config, RENAME_STEPS)
    if revision != RENAME_STEPS:
        command.downgrade(config, revision)


class OldStatusDocument(TypedDict):
    sdoc_id: int
    doctype: DocType
    status: dict[str, int]
    status_before: SDocStatus


@pytest.fixture(scope="function")
def old_status_database(
    db_session: Session, test_project: ProjectORM
) -> Generator[dict[str, OldStatusDocument], None, None]:
    """
    This fixture migrates the database down to the revision before
    `448579029394_sdoc_step_status_per_feature` and sets up documents as they
    were then: every step column is set, the columns of steps that are no step
    of the doctype (`OLD_STEPS_BY_DOCTYPE`) hold 0. It migrates the database back
    to head afterwards.

    `test_project` holds, per doctype (text, image, audio, video), four documents
    named `<doctype>_<case>`, in the folder "migration":

    - `finished`: all steps of the doctype are finished (1)
    - `processing`: all steps are finished except the second-to-last (0)
    - `erroneous`: all steps are finished except the second (-100) and third (0)
    - `new`: all steps are processing (0)

    sourcedocumentjobstatus holds, for `text_finished`, finished rows (3) of the
    ML jobs DOCUMENT_EMBEDDING (102), SENTENCE_EMBEDDING (103) and
    COREFERENCE_RESOLUTION (101), and for `text_processing` a failed row (4) of
    DOCUMENT_EMBEDDING.

    Returned by name, with its step status (all old columns) and the
    processed_status the application read before the migration
    (`status_before`): -100 if the sum of all columns is negative, 1 if it
    equals the step count of the doctype, 0 otherwise.

    Non-obvious derived behavior:

    - text_spacy is a step of every doctype, as every doctype has text steps.
    """
    project_id = test_project.id
    db_session.commit()
    config = alembic_config()
    downgrade_from_head(db_session, config, BEFORE_STEP_STATUS)
    try:
        cases: dict[str, Callable[[list[str]], dict[str, int]]] = {
            "finished": lambda steps: dict.fromkeys(steps, 1),
            "processing": lambda steps: {**dict.fromkeys(steps, 1), steps[-2]: 0},
            "erroneous": lambda steps: {
                **dict.fromkeys(steps, 1),
                steps[1]: -100,
                steps[2]: 0,
            },
            "new": lambda steps: dict.fromkeys(steps, 0),
        }
        folder_id = db_session.execute(
            sa.text(
                "INSERT INTO folder (name, folder_type, project_id) "
                "VALUES ('migration', 'normal', :p) RETURNING id"
            ),
            {"p": project_id},
        ).scalar_one()
        documents: dict[str, OldStatusDocument] = {}
        for doctype, steps in OLD_STEPS_BY_DOCTYPE.items():
            for case, step_values in cases.items():
                name = f"{doctype.value}_{case}"
                status = {c: step_values(steps).get(c, 0) for c in OLD_STATUS_COLUMNS}
                sdoc_id = db_session.execute(
                    sa.text(
                        "INSERT INTO sourcedocument (filename, name, doctype, "
                        "project_id, folder_id, "
                        + ", ".join(OLD_STATUS_COLUMNS)
                        + ") VALUES (:name, :name, :doctype, :p, :f, "
                        + ", ".join(f":{c}" for c in OLD_STATUS_COLUMNS)
                        + ") RETURNING id"
                    ),
                    {
                        **status,
                        "name": name,
                        "doctype": doctype.value,
                        "p": project_id,
                        "f": folder_id,
                    },
                ).scalar_one()
                total = sum(status.values())
                documents[name] = {
                    "sdoc_id": sdoc_id,
                    "doctype": doctype,
                    "status": status,
                    "status_before": SDocStatus.erroneous
                    if total < 0
                    else SDocStatus.finished
                    if total == len(steps)
                    else SDocStatus.processing,
                }
        job_rows = [
            ("text_finished", ML_DOCUMENT_EMBEDDING, ML_FINISHED),
            ("text_finished", ML_SENTENCE_EMBEDDING, ML_FINISHED),
            ("text_finished", ML_COREFERENCE, ML_FINISHED),
            ("text_processing", ML_DOCUMENT_EMBEDDING, ML_ERROR),
        ]
        for name, job_type, job_status in job_rows:
            db_session.execute(
                sa.text(
                    "INSERT INTO sourcedocumentjobstatus (id, type, status, timestamp) "
                    "VALUES (:id, :type, :status, now())"
                ),
                {
                    "id": documents[name]["sdoc_id"],
                    "type": job_type,
                    "status": job_status,
                },
            )
        db_session.commit()
        yield documents
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


ENABLED_FEATURES = "f0bfbe883d73"
ARTEFACT_COMPUTATIONS = "457909d274d4"


@pytest.fixture(scope="function")
def feature_activations_database(
    db_session: Session, test_project: ProjectORM
) -> Generator[int, None, None]:
    """
    This fixture migrates the database down to the revision before
    `457909d274d4_rename_the_feature_activations_to_` and gives `test_project`
    the pending feature activation {"full_text_search": "a1"}. It migrates the
    database back to head afterwards.

    Returns the id of `test_project`.
    """
    project_id = test_project.id
    db_session.commit()
    config = alembic_config()
    downgrade_from_head(db_session, config, ENABLED_FEATURES)
    try:
        db_session.execute(
            sa.text(
                "UPDATE project SET feature_activations = "
                "CAST(:activations AS jsonb) WHERE id = :id"
            ),
            {"activations": json.dumps({"full_text_search": "a1"}), "id": project_id},
        )
        db_session.commit()
        yield project_id
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


DROP_ML_JOB_STATUS = "62a07ecd1e32"


@pytest.fixture(scope="function")
def ml_job_status_database(
    db_session: Session, project_with_sdoc: ProjectWithSdoc
) -> Generator[int, None, None]:
    """
    This fixture migrates the database down to the revision before
    `62a07ecd1e32_drop_the_ml_job_status_table` and gives the document of
    `project_with_sdoc` a finished coreference row in `sourcedocumentjobstatus`.
    It migrates the database back to head afterwards.

    Returns the id of the document.
    """
    sdoc_id = project_with_sdoc["source_document"].id
    db_session.commit()
    config = alembic_config()
    downgrade_from_head(db_session, config, ARTEFACT_COMPUTATIONS)
    try:
        db_session.execute(
            sa.text(
                "INSERT INTO sourcedocumentjobstatus (id, type, status, timestamp) "
                "VALUES (:id, :type, :status, now())"
            ),
            {"id": sdoc_id, "type": ML_COREFERENCE, "status": ML_FINISHED},
        )
        db_session.commit()
        yield sdoc_id
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


HUMAN_CODE = "a7b1a760a827"


class PersonBoxesDatabase(TypedDict):
    coco_project_id: int
    own_human_project_id: int
    own_human_code_id: int
    system_person_box_ids: dict[int, list[int]]
    user_person_box_ids: dict[int, list[int]]
    system_cat_box_ids: dict[int, list[int]]


def _insert(db: Session, sql: str, **params: object) -> int:
    return db.execute(sa.text(sql), params).scalar_one()


def _person_boxes_project(
    db: Session, *, title: str, user_id: int, own_human: bool
) -> tuple[int, list[int], list[int], list[int]]:
    """A project with two of the COCO system codes as they were before HUMAN
    and the system codes NAMED_ENTITY > PERSON, one image and its boxes;
    returns its id and the ids of the system user's PERSON boxes, the user's
    PERSON box and the system user's CAT box."""
    project_id = _insert(
        db,
        "INSERT INTO project (title, description, enabled_features) "
        "VALUES (:title, 'boxes', '{object_detection}') RETURNING id",
        title=title,
    )
    crud_code.create_system_codes(
        db,
        project_id=project_id,
        codes=[
            SystemCode(
                "ANIMAL",
                "Super Object Category from COCO 2017",
                children=(SystemCode("CAT", "Object Category from COCO 2017"),),
            ),
            SystemCode("BACKGROUND", "Super Object Category from COCO 2017"),
            SystemCode(
                "NAMED_ENTITY",
                "A named entity",
                children=(SystemCode("PERSON", "People, including fictional"),),
            ),
        ],
    )
    if own_human:
        crud_code.create(
            db=db,
            project_id=project_id,
            create_dto=CodeCreate(
                name="HUMAN",
                description="My people",
                is_system=False,
                enabled=True,
            ),
        )
    folder_id = _insert(
        db,
        "INSERT INTO folder (name, project_id, folder_type) "
        "VALUES ('people.png', :project_id, 'sdoc_folder') RETURNING id",
        project_id=project_id,
    )
    sdoc_id = _insert(
        db,
        "INSERT INTO sourcedocument (filename, name, doctype, project_id, folder_id) "
        "VALUES ('people.png', 'people.png', 'image', :project_id, :folder_id) "
        "RETURNING id",
        project_id=project_id,
        folder_id=folder_id,
    )
    code_ids = {
        code.name: code.id
        for code in crud_code.read_system_codes_by_project(db=db, project_id=project_id)
    }
    boxes: dict[tuple[int, str], list[int]] = {}
    for owner, names in (
        (SYSTEM_USER_ID, ["PERSON", "PERSON", "CAT"]),
        (user_id, ["PERSON"]),
    ):
        adoc_id = _insert(
            db,
            "INSERT INTO annotationdocument (user_id, source_document_id) "
            "VALUES (:user_id, :sdoc_id) RETURNING id",
            user_id=owner,
            sdoc_id=sdoc_id,
        )
        for name in names:
            boxes.setdefault((owner, name), []).append(
                _insert(
                    db,
                    "INSERT INTO bboxannotation (uuid, project_id, "
                    "annotation_document_id, code_id, x_min, y_min, x_max, y_max) "
                    "VALUES (:uuid, :project_id, :adoc_id, :code_id, 0, 0, 1, 1) "
                    "RETURNING id",
                    uuid=str(uuid4()),
                    project_id=project_id,
                    adoc_id=adoc_id,
                    code_id=code_ids[name],
                )
            )
    return (
        project_id,
        boxes[(SYSTEM_USER_ID, "PERSON")],
        boxes[(user_id, "PERSON")],
        boxes[(SYSTEM_USER_ID, "CAT")],
    )


@pytest.fixture(scope="function")
def person_boxes_database(
    db_session: Session, test_user: UserORM
) -> Generator[PersonBoxesDatabase, None, None]:
    """
    This fixture migrates the database down to the revision before
    `a7b1a760a827_object_boxes_of_people_get_the_code_` and sets up two
    projects as they were then, each with the COCO system codes ANIMAL > CAT
    and BACKGROUND (below SYSTEM_CODE, no HUMAN), the system codes
    NAMED_ENTITY > PERSON and one image with these bbox annotations:

    - two boxes of the system user with the code PERSON,
    - one box of the system user with the code CAT (below ANIMAL),
    - one box of `test_user` with the code PERSON.

    `coco` has nothing else; `own human` also has the top-level user code
    HUMAN ("My people"). It migrates the database back to head afterwards.
    """
    db_session.commit()
    config = alembic_config()
    downgrade_from_head(db_session, config, DROP_ML_JOB_STATUS)
    try:
        result: PersonBoxesDatabase = {
            "coco_project_id": 0,
            "own_human_project_id": 0,
            "own_human_code_id": 0,
            "system_person_box_ids": {},
            "user_person_box_ids": {},
            "system_cat_box_ids": {},
        }
        for title, own_human in (("coco", False), ("own human", True)):
            project_id, system_person, user_person, system_cat = _person_boxes_project(
                db_session, title=title, user_id=test_user.id, own_human=own_human
            )
            result["coco_project_id" if not own_human else "own_human_project_id"] = (
                project_id
            )
            result["system_person_box_ids"][project_id] = system_person
            result["user_person_box_ids"][project_id] = user_person
            result["system_cat_box_ids"][project_id] = system_cat
        own_human_code = crud_code.read_by_name_and_project(
            db_session, code_name="HUMAN", project_id=result["own_human_project_id"]
        )
        assert own_human_code is not None
        result["own_human_code_id"] = own_human_code.id
        db_session.commit()
        yield result
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


# the steps renamed by 10b8dac1fdd6, old name -> new name
RENAMED_STEPS = {
    "extract_html": "html_extraction",
    "text_language_detection": "language_detection",
    "text_spacy": "tokens_sentences",
    "text_html_mapping": "html_mapping",
    "text_es_index": "es_index",
    "text_word_frequency": "word_frequency",
    "text_sentence_embedding": "sentence_embedding",
    "text_keywords": "keywords",
    "text_ner": "named_entity_recognition",
    "text_document_embedding": "document_embedding",
    "image_object_detection": "object_detection",
    "audio_transcription": "transcription",
    "audio_metadata": "audio_metadata_extraction",
    "video_metadata": "video_metadata_extraction",
}
# steps whose names stay
KEPT_STEPS = ["text_extraction", "image_caption", "coreference_resolution"]


@pytest.fixture(scope="function")
def old_step_names_database(
    db_session: Session, project_with_sdoc: ProjectWithSdoc
) -> Generator[dict[str, int], None, None]:
    """
    This fixture migrates the database down to the revision before
    `10b8dac1fdd6_rename_the_pipeline_steps` and replaces the step status rows
    of the document of `project_with_sdoc` with one row per old step name
    (`RENAMED_STEPS`) and per kept name (`KEPT_STEPS`), the n-th of them with
    status 1 if n is even and -100 otherwise. It migrates the database back to
    head afterwards.

    Returns the status per step name and, under "sdoc_id", the document id.
    """
    sdoc_id = project_with_sdoc["source_document"].id
    db_session.commit()
    config = alembic_config()
    downgrade_from_head(db_session, config, HUMAN_CODE)
    try:
        db_session.execute(
            sa.text("DELETE FROM sourcedocumentstepstatus WHERE sdoc_id = :id"),
            {"id": sdoc_id},
        )
        statuses: dict[str, int] = {}
        for n, step in enumerate([*RENAMED_STEPS, *KEPT_STEPS]):
            statuses[step] = 1 if n % 2 == 0 else -100
            db_session.execute(
                sa.text(
                    "INSERT INTO sourcedocumentstepstatus (sdoc_id, step, status) "
                    "VALUES (:id, :step, :status)"
                ),
                {"id": sdoc_id, "step": step, "status": statuses[step]},
            )
        db_session.commit()
        yield {**statuses, "sdoc_id": sdoc_id}
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


class OldFileLayoutDatabase(TypedDict):
    project_dir: Path
    sdoc_ids: dict[str, int]
    classifier_id: int
    cota_id: int
    aspect_id: int
    deleted_aspect_id: int


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


@pytest.fixture(scope="function")
def old_file_layout_database(
    db_session: Session, test_project: ProjectORM
) -> Generator[OldFileLayoutDatabase, None, None]:
    """
    This fixture migrates the database down to the revision before
    `807bab97f373_file_store` and sets up `test_project` with its files in the
    old layout below `projects/<id>/`. Each file holds its own old path
    relative to the project folder. It migrates the database back to head
    afterwards.

    Documents (in the folder "migration"), by filename:

    - `text.txt` (text): `docs/text.txt`
    - `photo.png` (image): `docs/photo.png`, `docs/photo.png.webp`,
      `docs/photo.png.thumbnail.webp`
    - `clip.mp4` (video): `docs/clip.mp4`, `docs/clip.mp4.thumbnail.webp`,
      and its audio stream `docs/clip.mp3`
    - `talk.mp4` (video): `docs/talk.mp4`, its audio stream `docs/talk.mp3`,
      whose name is the filename of the audio document below
    - `talk.mp3` (audio): `docs/talk.mp3` (the same file)
    - `moved.txt` (text): already moved by a previous run, at
      `sdoc_files/<id>/moved.txt` (holds "moved before"), and still at
      `docs/moved.txt`

    Other files:

    - `docs/split.pdf` and `docs/archive.zip`: no document
    - classifier `classifier_id` with path `<root>/projects/<id>/models/
      doc_classifier_abc/epoch=1-step=2.ckpt`: that file and
      `models/doc_classifier_abc/train_logs/metrics.csv`
    - concept over time analysis `cota_id`: `models/cota_<cota_id>` (a folder with
      `weights.bin`) and `models/cota_<cota_id>-best-model` (with `weights.bin`),
      training leftovers of a refinement that nothing reads
    - aspect `aspect_id`: `models/umap_aspect_<aspect_id>_default`,
      `models/prompt_embedder_DocType.text_project_<id>_aspect_<aspect_id>_20250101_120000`
      (a folder with `model.safetensors`), the checkpoints
      `models/prompt_embedder_chkpt_DocType.text_project_<id>_aspect_<aspect_id>_20250101_120000`
      and `plots/aspect_<aspect_id>_map_thumbnail.png`
    - a deleted aspect `deleted_aspect_id` (no row):
      `models/umap_aspect_<deleted>_default`, `plots/aspect_<deleted>_map_thumbnail.png`
    - `dataloaders/cota_1`

    Returned with the project folder, the document ids by filename and the
    ids of the classifier, the analysis and the aspects.
    """
    project_id = test_project.id
    db_session.commit()
    config = alembic_config()
    downgrade_from_head(db_session, config, RENAME_STEPS)
    root = Path(conf.filesystem.root_directory)
    project_dir = root / "projects" / str(project_id)
    try:
        folder_id = _insert(
            db_session,
            "INSERT INTO folder (name, folder_type, project_id) "
            "VALUES ('migration', 'normal', :p) RETURNING id",
            p=project_id,
        )
        sdoc_ids: dict[str, int] = {}
        for filename, doctype in (
            ("text.txt", "text"),
            ("photo.png", "image"),
            ("clip.mp4", "video"),
            ("talk.mp4", "video"),
            ("talk.mp3", "audio"),
            ("moved.txt", "text"),
        ):
            sdoc_ids[filename] = _insert(
                db_session,
                "INSERT INTO sourcedocument (filename, name, doctype, project_id, "
                "folder_id) VALUES (:f, :f, :d, :p, :folder) RETURNING id",
                f=filename,
                d=doctype,
                p=project_id,
                folder=folder_id,
            )
        checkpoint = project_dir / "models/doc_classifier_abc/epoch=1-step=2.ckpt"
        classifier_id = _insert(
            db_session,
            "INSERT INTO classifier (name, base_model, type, path, labelid2classid, "
            "train_params, train_loss, train_data_stats, project_id) VALUES "
            "('c', 'bert', 'document', :path, '{}', '{}', '[]', '[]', :p) "
            "RETURNING id",
            path=str(checkpoint),
            p=project_id,
        )
        cota_id = _insert(
            db_session,
            "INSERT INTO conceptovertimeanalysis (name, project_id) "
            "VALUES ('cota', :p) RETURNING id",
            p=project_id,
        )
        aspect_ids = [
            _insert(
                db_session,
                "INSERT INTO aspect (name, doc_embedding_prompt, is_hierarchical, "
                "project_id) VALUES (:name, '', false, :p) RETURNING id",
                name=name,
                p=project_id,
            )
            for name in ("aspect", "deleted")
        ]
        aspect_id, deleted_aspect_id = aspect_ids
        db_session.execute(
            sa.text("DELETE FROM aspect WHERE id = :id"), {"id": deleted_aspect_id}
        )
        db_session.commit()

        embedder = f"project_{project_id}_aspect_{aspect_id}_20250101_120000"
        old_files = [
            "docs/text.txt",
            "docs/photo.png",
            "docs/photo.png.webp",
            "docs/photo.png.thumbnail.webp",
            "docs/clip.mp4",
            "docs/clip.mp4.thumbnail.webp",
            "docs/clip.mp3",
            "docs/talk.mp4",
            "docs/talk.mp3",
            "docs/moved.txt",
            "docs/split.pdf",
            "docs/archive.zip",
            "models/doc_classifier_abc/epoch=1-step=2.ckpt",
            "models/doc_classifier_abc/train_logs/metrics.csv",
            f"models/cota_{cota_id}/weights.bin",
            f"models/cota_{cota_id}-best-model/weights.bin",
            f"models/umap_aspect_{aspect_id}_default",
            f"models/prompt_embedder_DocType.text_{embedder}/model.safetensors",
            f"models/prompt_embedder_chkpt_DocType.text_{embedder}/step.bin",
            f"plots/aspect_{aspect_id}_map_thumbnail.png",
            f"models/umap_aspect_{deleted_aspect_id}_default",
            f"plots/aspect_{deleted_aspect_id}_map_thumbnail.png",
            "dataloaders/cota_1",
        ]
        for old in old_files:
            _write(project_dir / old, old)
        _write(
            project_dir / f"sdoc_files/{sdoc_ids['moved.txt']}/moved.txt",
            "moved before",
        )
        yield {
            "project_dir": project_dir,
            "sdoc_ids": sdoc_ids,
            "classifier_id": classifier_id,
            "cota_id": cota_id,
            "aspect_id": aspect_id,
            "deleted_aspect_id": deleted_aspect_id,
        }
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


# the composite keys, which add project_id to the tables of FILLED_TABLES and key
# every project-owned table by (project_id, id)
COMPOSITE_KEYS = "7f1bbe0f69d7"


def rows_by_project(db: Session) -> dict[str, dict[int, int]]:
    """The number of rows per project of every table of FILLED_TABLES."""
    return {
        table: {
            project_id: count
            for project_id, count in db.execute(
                sa.text(f"SELECT project_id, count(*) FROM {table} GROUP BY project_id")
            ).tuples()
        }
        for table in FILLED_TABLES
    }


@pytest.fixture(scope="function")
def before_composite_keys_database(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> Generator[dict[str, dict[int, int]], None, None]:
    """
    This fixture sets up the rows of `create_two_tenants`
    (composite_keys_test_utils.TwoTenants and TenantRows list them) in the test
    project and in "Foreign Project", then migrates the database down to
    the revision before the composite keys, which drops the project_id columns
    of FILLED_TABLES and turns the project_id of objecthandle back into the
    attached project.

    Returned with the number of rows per project of every table of
    FILLED_TABLES, counted before the downgrade.
    """
    create_two_tenants(db_session, user=test_user, project=test_project)
    counts = rows_by_project(db_session)
    db_session.commit()
    config = alembic_config()
    command.downgrade(config, FILE_STORE)
    try:
        yield counts
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")
