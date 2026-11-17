"""The text steps project and helpers that run a text step's job handler, for
the tests of the text steps in several folders."""

from typing import TypedDict

import rq.job
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import (
    _create_sdoc,
    create_project_with_features,
    minimal_text_steps,
)
from repos.ray.dto.spacy import SpacyPipelineOutput, SpacySpan, SpacyToken
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService


class TextStepsProject(TypedDict):
    """
    This fixture sets up the following project of `test_user`:

    - project: "Text Steps Project", with keyword statistics, word frequency
      analysis and automatic entity annotations enabled, so it has the system
      codes `NAMED_ENTITY` > `PERSON`, `ORG`, ...
    - text: text document "text.txt" with the text of `SDOC_SENTENCES`
      ("Hello world. The cat sits on the mat.") and the language "en"; the
      steps of a project without features and keywords,
      word_frequency and named_entity_recognition are finished (no data of the last three
      is stored)
    - spacy_running: text document "spacy_running.txt" with the same text;
      html_extraction, text_extraction, language_detection and es_index
      are finished, tokens_sentences and html_mapping are processing (the spaCy
      job runs), no other step is planned

    Non-obvious derived behavior:

    - keywords, word_frequency and named_entity_recognition each follow the language
      detection only, not tokens_sentences.
    """

    project: ProjectORM
    text: SourceDocumentORM
    spacy_running: SourceDocumentORM


def create_text_steps_project(db: Session, user: UserORM) -> TextStepsProject:
    """The project described in `TextStepsProject`."""
    project = create_project_with_features(
        db,
        user,
        title="Text Steps Project",
        features=["keyword_statistics", "word_frequency", "entity_annotations"],
    )
    text = _create_sdoc(
        db,
        project,
        name="text.txt",
        doctype=DocType.text,
        status={
            **dict.fromkeys(minimal_text_steps(), 1),
            "keywords": 1,
            "word_frequency": 1,
            "named_entity_recognition": 1,
        },
    )
    spacy_running = _create_sdoc(
        db,
        project,
        name="spacy_running.txt",
        doctype=DocType.text,
        status={
            "html_extraction": 1,
            "text_extraction": 1,
            "language_detection": 1,
            "es_index": 1,
            "tokens_sentences": 0,
            "html_mapping": 0,
        },
    )
    db.commit()
    for obj in (project, text, spacy_running):
        db.refresh(obj)
    return {"project": project, "text": text, "spacy_running": spacy_running}


def spacy_output(text: str, entities: dict[str, str]) -> SpacyPipelineOutput:
    """What spaCy returns for the text: a token per word (split at spaces, a
    trailing "." split off as punctuation; "the" and "on" are stopwords) and
    the given entities (word -> label), each one token long. Tests replace
    `RayRepo.spacy_pipline` with it, as spaCy is an external service."""
    tokens: list[SpacyToken] = []
    start = 0
    for word in text.split(" "):
        parts = [word[:-1], "."] if word.endswith(".") else [word]
        for part in parts:
            begin = text.index(part, start)
            start = begin + len(part)
            tokens.append(
                SpacyToken(
                    text=part,
                    start_char=begin,
                    end_char=start,
                    pos="X",
                    lemma=part.lower(),
                    is_stopword=part.lower() in {"the", "on"},
                    is_punctuation=part == ".",
                    is_alpha=part.isalpha(),
                    is_digit=part.isdigit(),
                )
            )
    ents = [
        SpacySpan(
            text=token.text,
            start_char=token.start_char,
            end_char=token.end_char,
            start_token=index,
            end_token=index + 1,
            label=entities[token.text],
        )
        for index, token in enumerate(tokens)
        if token.text in entities
    ]
    return SpacyPipelineOutput(tokens=tokens, ents=ents, sents=[])


def run_step_handler(step: str, payload: dict[str, object]) -> None:
    """Run the handler of the step's job, taken from the job registry by the
    step name, on an input built from the dict."""
    registered = JobService().job_registry[step]
    handler = registered["handler"]
    handler(
        registered["input_type"].model_validate(payload),
        Job(rq.job.Job.create(handler, connection=JobService().redis_conn)),
    )
