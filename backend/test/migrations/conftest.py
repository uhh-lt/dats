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
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.system_codes import SystemCode
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_enum import AttachedObjectType
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import SYSTEM_USER_ID
from core.user.user_orm import UserORM
from dats_test_utils import ProjectWithSdoc, create_span_for_text, create_text_document

ZEROSHOT_ID = 9990
FEWSHOT_ID = 9991
TRAINED_ID = 9992
SENTENCES = ["Alpha beta gamma.", "Delta epsilon zeta."]


class AssistantUsersDatabase(TypedDict):
    project: ProjectORM
    other_project: ProjectORM
    empty_project: ProjectORM
    user: UserORM
    sdoc: SourceDocumentORM
    zeroshot_span_ids: list[int]
    zeroshot_sentence_id: int
    fewshot_span_id: int
    trained_span_id: int
    human_copy_id: int
    zeroshot_memo_id: int
    memo_about_zeroshot_id: int
    timeline_analysis_id: int
    search_view_id: int


def _insert_assistant_user(db: Session, *, user_id: int, last_name: str) -> None:
    """The global assistant users as bootstrap created them before the migration."""
    db.execute(
        sa.text(
            'INSERT INTO "user" (id, email, first_name, last_name, password) '
            "VALUES (:id, :email, 'ASSISTANT', :last_name, 'hashed')"
        ),
        {
            "id": user_id,
            "email": f"assistant-{last_name.lower()}@dats.org",
            "last_name": last_name,
        },
    )


@pytest.fixture(scope="function")
def assistant_users_database(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> AssistantUsersDatabase:
    """
    This fixture sets up a database as it was before the migration
    `2bbc904aa055_virtual_users` moved the global assistant users:

    - Global assistant users 9990 (zero-shot), 9991 (few-shot) and 9992 (trained),
      members of all three projects below.
    - `project` (the test project of `user`), code "Claim", document `sdoc` with
      the sentences "Alpha beta gamma." and "Delta epsilon zeta.":
      - zero-shot span annotations "Alpha" and "Delta" (`zeroshot_span_ids`) and
        the zero-shot sentence annotation of sentence 0 (`zeroshot_sentence_id`)
      - few-shot span annotation "beta" (`fewshot_span_id`)
      - span annotation "Alpha" of `user` copied from the zero-shot "Alpha"
        (`human_copy_id`, provenance source user 9990)
      - memo "Zero-shot note" written by 9990 on the zero-shot "Alpha"
        (`zeroshot_memo_id`)
      - memo "About the assistant" of `user` attached to the object handle of
        user 9990 (`memo_about_zeroshot_id`)
      - timeline analysis "Assistant timeline" whose only concept filters
        `SD_USER_ID_LIST` contains [9990, `user`] (`timeline_analysis_id`)
      - search view "Assistant spans" of `user` filtering `SP_USER_ID` == 9990
        (`search_view_id`)
    - `other_project` ("Other Project" of `user`): document "other_doc.txt" with
      the trained span annotation "gamma." (`trained_span_id`)
    - `empty_project` ("Empty Project" of `user`): no data of any assistant

    Non-obvious derived behavior:

    - The migration creates "Assistant (zero-shot)" and "Assistant (few-shot)" in
      `project`, "Assistant (trained)" in `other_project` and nothing in
      `empty_project`, then deletes the global users with their memberships.
    """
    project = test_project
    projects = [project]
    for title in ("Other Project", "Empty Project"):
        read = ProjectService().create_project(
            db=db_session,
            create_dto=ProjectCreate(title=title, description=""),
            creating_user_id=test_user.id,
        )
        projects.append(crud_project.read(db=db_session, id=read.id))
    _, other_project, empty_project = projects

    # 1) the global assistant users, members of every project
    for user_id, last_name in (
        (ZEROSHOT_ID, "ZeroShot"),
        (FEWSHOT_ID, "FewShot"),
        (TRAINED_ID, "Trained"),
    ):
        _insert_assistant_user(db_session, user_id=user_id, last_name=last_name)
        for p in projects:
            crud_project.associate_user(db=db_session, project_id=p.id, user_id=user_id)

    # 2) annotations of the assistants and a human copy
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(name="Claim", project_id=project.id, is_system=False),
    )
    sdoc = create_text_document(
        db_session, project=project, filename="doc.txt", name="doc", sentences=SENTENCES
    )
    zeroshot_spans = [
        create_span_for_text(
            db_session, sdoc=sdoc, text=text, code_id=code.id, user_id=ZEROSHOT_ID
        )
        for text in ("Alpha", "Delta")
    ]
    zeroshot_sentence_id = (
        SentenceAnnotationService()
        .create(
            db=db_session,
            user_id=ZEROSHOT_ID,
            create_dto=SentenceAnnotationCreate(
                sdoc_id=sdoc.id,
                code_id=code.id,
                sentence_id_start=0,
                sentence_id_end=0,
            ),
        )
        .id
    )
    fewshot_span = create_span_for_text(
        db_session, sdoc=sdoc, text="beta", code_id=code.id, user_id=FEWSHOT_ID
    )
    alpha = zeroshot_spans[0]
    human_copy_id = (
        SpanAnnotationService()
        .create(
            db=db_session,
            user_id=test_user.id,
            create_dto=SpanAnnotationCreate(
                sdoc_id=sdoc.id,
                code_id=code.id,
                begin=alpha.begin,
                end=alpha.end,
                begin_token=alpha.begin_token,
                end_token=alpha.end_token,
                span_text="Alpha",
                source_annotation_id=alpha.id,
            ),
        )
        .id
    )
    other_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Claim", project_id=other_project.id, is_system=False
        ),
    )
    other_sdoc = create_text_document(
        db_session,
        project=other_project,
        filename="other_doc.txt",
        name="other_doc",
        sentences=SENTENCES,
    )
    trained_span = create_span_for_text(
        db_session,
        sdoc=other_sdoc,
        text="gamma.",
        code_id=other_code.id,
        user_id=TRAINED_ID,
    )

    # 3) memos by and about the zero-shot assistant
    zeroshot_memo = crud_memo.create_for_attached_object(
        db=db_session,
        attached_object_id=alpha.id,
        attached_object_type=AttachedObjectType.span_annotation,
        create_dto=MemoCreateIntern(
            title="Zero-shot note",
            content="",
            content_json="",
            project_id=project.id,
            user_id=ZEROSHOT_ID,
            uuid=str(uuid4()),
        ),
    )
    user_handle_id = db_session.execute(
        sa.text("INSERT INTO objecthandle (user_id) VALUES (:id) RETURNING id"),
        {"id": ZEROSHOT_ID},
    ).scalar_one()
    memo_about_zeroshot_id = db_session.execute(
        sa.text(
            "INSERT INTO memo (uuid, title, content, content_json, attached_to_id, "
            "project_id, user_id) VALUES (:uuid, 'About the assistant', '', '', "
            ":handle, :project_id, :user_id) RETURNING id"
        ),
        {
            "uuid": str(uuid4()),
            "handle": user_handle_id,
            "project_id": project.id,
            "user_id": test_user.id,
        },
    ).scalar_one()

    # 4) saved filters on the zero-shot assistant
    user_filter = {
        "id": "root",
        "logic_operator": "and",
        "items": [
            {
                "id": "user",
                "column": "SD_USER_ID_LIST",
                "operator": "ID_LIST_CONTAINS",
                "value": [ZEROSHOT_ID, test_user.id],
            }
        ],
    }
    timeline_analysis_id = db_session.execute(
        sa.text(
            "INSERT INTO timelineanalysis (name, timeline_analysis_type, concepts, "
            "settings, project_id) VALUES ('Assistant timeline', 'DOCUMENT', "
            "CAST(:concepts AS jsonb), '{}'::jsonb, :project_id) RETURNING id"
        ),
        {
            "concepts": json.dumps([{"name": "Assistant", "filter": user_filter}]),
            "project_id": project.id,
        },
    ).scalar_one()
    search_view_id = db_session.execute(
        sa.text(
            "INSERT INTO searchview (name, entity_type, layout, filters, position, "
            "project_id, user_id) VALUES ('Assistant spans', 'span_annotation', "
            "'table', CAST(:filters AS json), 0, :project_id, :user_id) RETURNING id"
        ),
        {
            "filters": json.dumps(
                {
                    "id": "root",
                    "logic_operator": "and",
                    "items": [
                        {
                            "id": "user",
                            "column": "SP_USER_ID",
                            "operator": "ID_EQUALS",
                            "value": ZEROSHOT_ID,
                        }
                    ],
                }
            ),
            "project_id": project.id,
            "user_id": test_user.id,
        },
    ).scalar_one()

    db_session.commit()
    return {
        "project": project,
        "other_project": other_project,
        "empty_project": empty_project,
        "user": test_user,
        "sdoc": sdoc,
        "zeroshot_span_ids": [span.id for span in zeroshot_spans],
        "zeroshot_sentence_id": zeroshot_sentence_id,
        "fewshot_span_id": fewshot_span.id,
        "trained_span_id": trained_span.id,
        "human_copy_id": human_copy_id,
        "zeroshot_memo_id": zeroshot_memo.id,
        "memo_about_zeroshot_id": memo_about_zeroshot_id,
        "timeline_analysis_id": timeline_analysis_id,
        "search_view_id": search_view_id,
    }


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
    command.downgrade(config, BEFORE_STEP_STATUS)
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


BEFORE_CAPTIONS_CORE = "f0bfbe883d73"
CAPTIONS_CORE = "41c2d56be9f3"


@pytest.fixture(scope="function")
def image_captions_toggle_database(
    db_session: Session, test_project: ProjectORM
) -> Generator[int, None, None]:
    """
    This fixture migrates the database down to the revision before
    `41c2d56be9f3_drop_the_image_captions_toggle` and sets up `test_project`
    as it was then: it enables the features "full_text_search" and
    "image_captions", and has the pending feature activations
    {"image_captions": "a1", "full_text_search": "a2"}. It migrates the
    database back to head afterwards.

    Returns the id of `test_project`.
    """
    project_id = test_project.id
    db_session.commit()
    config = alembic_config()
    command.downgrade(config, BEFORE_CAPTIONS_CORE)
    try:
        db_session.execute(
            sa.text(
                "UPDATE project SET enabled_features = :features, "
                "feature_activations = CAST(:activations AS jsonb) WHERE id = :id"
            ),
            {
                "features": ["full_text_search", "image_captions"],
                "activations": json.dumps(
                    {"image_captions": "a1", "full_text_search": "a2"}
                ),
                "id": project_id,
            },
        )
        db_session.commit()
        yield project_id
    finally:
        db_session.rollback()
        db_session.close()
        command.upgrade(config, "head")


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
    command.downgrade(config, CAPTIONS_CORE)
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
    command.downgrade(config, ARTEFACT_COMPUTATIONS)
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
            create_dto=CodeCreate(
                name="HUMAN",
                description="My people",
                project_id=project_id,
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
    command.downgrade(config, DROP_ML_JOB_STATUS)
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


RENAME_STEPS = "10b8dac1fdd6"
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
    command.downgrade(config, HUMAN_CODE)
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
