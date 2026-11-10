import json
from typing import Callable, TypedDict
from uuid import uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_enum import AttachedObjectType
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_orm import UserORM
from dats_test_utils import create_span_for_text, create_text_document

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


# The step status columns as before migration 448579029394 (all NOT NULL).
_STATUS_COLUMNS = [
    "extract_html",
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
    "image_caption",
    "image_embedding",
    "image_metadata_extraction",
    "image_thumbnail",
    "image_object_detection",
    "audio_metadata",
    "audio_thumbnail",
    "audio_transcription",
    "video_metadata",
    "video_thumbnail",
    "video_audio_extraction",
]
_HTML_STEPS = [
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
]
SDOC_STEPS_BY_DOCTYPE = {
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


class SdocStatusDocument(TypedDict):
    sdoc_id: int
    doctype: DocType
    status_before: SDocStatus


@pytest.fixture(scope="function")
def sdoc_status_database(
    db_session: Session, test_project: ProjectORM
) -> dict[str, SdocStatusDocument]:
    """
    This fixture sets up the step status columns of documents as they were before
    the migration `448579029394_sdoc_status_null_means_not_planned`: every column is
    set, the columns of steps that are no step of the doctype hold 0.

    `test_project` holds, per doctype (text, image, audio, video), four documents
    named `<doctype>_<case>`:

    - `finished`: all steps of the doctype are finished (1)
    - `processing`: all steps are finished except the second-to-last (0)
    - `erroneous`: all steps are finished except the second (-100) and third (0)
    - `new`: all steps are processing (0)

    Returned by name, with the processed_status the application read before the
    migration (`status_before`): -100 if the sum of all columns is negative, 1 if
    it equals the step count of the doctype, 0 otherwise.
    """
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

    documents: dict[str, SdocStatusDocument] = {}
    for doctype, steps in SDOC_STEPS_BY_DOCTYPE.items():
        for case, step_values in cases.items():
            name = f"{doctype.value}_{case}"
            sdoc = crud_sdoc.create(
                db=db_session,
                create_dto=SourceDocumentCreate(
                    filename=name,
                    name=name,
                    doctype=doctype,
                    project_id=test_project.id,
                ),
            )
            values = {c: step_values(steps).get(c, 0) for c in _STATUS_COLUMNS}
            db_session.execute(
                sa.text(
                    "UPDATE sourcedocument SET "
                    + ", ".join(f"{c} = :{c}" for c in _STATUS_COLUMNS)
                    + " WHERE id = :id"
                ),
                {**values, "id": sdoc.id},
            )
            total = sum(values.values())
            documents[name] = {
                "sdoc_id": sdoc.id,
                "doctype": doctype,
                "status_before": SDocStatus.erroneous
                if total < 0
                else SDocStatus.finished
                if total == len(steps)
                else SDocStatus.processing,
            }

    db_session.commit()
    return documents


# The step status columns as before migration f2811eafb060 (text_spacy still
# wrote keywords, word frequencies and named entities).
_SPLIT_HTML_STEPS = [
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
]
SPLIT_STEPS_BY_DOCTYPE = {
    DocType.text: ["extract_html", *_SPLIT_HTML_STEPS],
    DocType.image: ["image_caption", "image_thumbnail", *_SPLIT_HTML_STEPS],
}
# sourcedocumentjobstatus types and statuses
ML_COREFERENCE = 101
ML_DOCUMENT_EMBEDDING = 102
ML_SENTENCE_EMBEDDING = 103
ML_FINISHED = 3
ML_ERROR = 4


class SplitStepsDocument(TypedDict):
    sdoc_id: int
    text_spacy: SDocStatus
    document_embedding_finished: bool
    status_before: SDocStatus


@pytest.fixture(scope="function")
def split_steps_database(
    db_session: Session, test_project: ProjectORM
) -> dict[str, SplitStepsDocument]:
    """
    This fixture sets up documents as they were before the migration
    `f2811eafb060_split_spacy_steps_and_add_document_`: the columns
    text_keywords, text_word_frequency, text_ner and text_document_embedding are
    NULL, the steps of the doctype (`SPLIT_STEPS_BY_DOCTYPE`) are set, all other
    step columns are NULL.

    `test_project` holds, per doctype (text, image), a document per combination
    named `<doctype>_<spacy>_<embedding>`:

    - `<spacy>`: the status of text_spacy, all other steps are finished:
      `finished` (1), `processing` (0) or `erroneous` (-100)
    - `<embedding>`: the row of the ML job DOCUMENT_EMBEDDING (type 102) in
      sourcedocumentjobstatus: `embedded` (status finished, 3), `failed`
      (status error, 4) or `none` (no row)

    Every document also has a finished SENTENCE_EMBEDDING row (103) and a finished
    COREFERENCE_RESOLUTION row (101).

    Returned by name, with its text_spacy status, whether its document embedding
    finished, and its processed_status before the migration (`status_before`,
    the status of text_spacy, since all other steps are finished).
    """
    spacy_cases = {
        "finished": SDocStatus.finished,
        "processing": SDocStatus.processing,
        "erroneous": SDocStatus.erroneous,
    }
    embedding_cases = {"embedded": ML_FINISHED, "failed": ML_ERROR, "none": None}

    documents: dict[str, SplitStepsDocument] = {}
    for doctype, steps in SPLIT_STEPS_BY_DOCTYPE.items():
        for spacy_case, spacy_status in spacy_cases.items():
            for embedding_case, ml_status in embedding_cases.items():
                name = f"{doctype.value}_{spacy_case}_{embedding_case}"
                sdoc = crud_sdoc.create(
                    db=db_session,
                    create_dto=SourceDocumentCreate(
                        filename=name,
                        name=name,
                        doctype=doctype,
                        project_id=test_project.id,
                    ),
                )
                values = {**dict.fromkeys(steps, 1), "text_spacy": spacy_status.value}
                db_session.execute(
                    sa.text(
                        "UPDATE sourcedocument SET "
                        + ", ".join(f"{c} = :{c}" for c in values)
                        + " WHERE id = :id"
                    ),
                    {**values, "id": sdoc.id},
                )
                job_rows = [(ML_SENTENCE_EMBEDDING, ML_FINISHED)]
                job_rows.append((ML_COREFERENCE, ML_FINISHED))
                if ml_status is not None:
                    job_rows.append((ML_DOCUMENT_EMBEDDING, ml_status))
                for job_type, job_status in job_rows:
                    db_session.execute(
                        sa.text(
                            "INSERT INTO sourcedocumentjobstatus "
                            "(id, type, status, timestamp) "
                            "VALUES (:id, :type, :status, now())"
                        ),
                        {"id": sdoc.id, "type": job_type, "status": job_status},
                    )
                documents[name] = {
                    "sdoc_id": sdoc.id,
                    "text_spacy": spacy_status,
                    "document_embedding_finished": ml_status == ML_FINISHED,
                    "status_before": spacy_status,
                }

    db_session.commit()
    return documents
