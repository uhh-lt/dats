from pathlib import Path
from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.repo.repo_service import RepoService


def export_selected_sentence_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
    sentence_annotation_ids: List[int],
) -> Path:
    sentence_annotations = crud_sentence_anno.read_by_ids(
        db=db, ids=sentence_annotation_ids
    )
    return __export_sentence_annotations(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_selected_sentence_annotations_export",
        sentence_annotations=sentence_annotations,
    )


def export_all_sentence_annotations(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    sentence_annotations = crud_sentence_anno.read_by_project(
        db=db, project_id=project_id
    )
    return __export_sentence_annotations(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_sentence_annotations_export",
        sentence_annotations=sentence_annotations,
    )


def __export_sentence_annotations(
    db: Session,
    repo: RepoService,
    fn: str,
    sentence_annotations: List[SentenceAnnotationORM],
) -> Path:
    if len(sentence_annotations) == 0:
        raise NoDataToExportError("No sentence annotations to export.")

    export_data = __generate_export_df_for_sentence_annotations(
        db=db, sentence_annotations=sentence_annotations
    )
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_sentence_annotations(
    db: Session,
    sentence_annotations: List[SentenceAnnotationORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(sentence_annotations)} Sentence Annotations ...")

    # find all unique sdoc_ids
    unique_sdoc_ids = set(
        [sa.annotation_document.source_document_id for sa in sentence_annotations]
    )

    # find all sdoc_data
    sdoc_data = {
        sdoc_data.id: sdoc_data
        for sdoc_data in crud_sdoc.read_data_batch(db=db, ids=list(unique_sdoc_ids))
        if sdoc_data is not None
    }

    # fill the DataFrame
    data = {
        "sdoc_name": [],
        "user_first_name": [],
        "user_last_name": [],
        "code_name": [],
        "created": [],
        "text": [],
        "text_begin_sent": [],
        "text_end_sent": [],
    }

    for sent_annotation in sentence_annotations:
        sdoc = sent_annotation.annotation_document.source_document
        user = sent_annotation.annotation_document.user
        sdata = sdoc_data[sdoc.id]

        data["sdoc_name"].append(sdoc.filename)
        data["user_first_name"].append(user.first_name)
        data["user_last_name"].append(user.last_name)
        data["code_name"].append(sent_annotation.code.name)
        data["created"].append(sent_annotation.created)
        data["text"].append(
            " ".join(
                sdata.sentences[
                    sent_annotation.sentence_id_start : sent_annotation.sentence_id_end
                    + 1
                ]
            )
        )
        data["text_begin_sent"].append(sent_annotation.sentence_id_start)
        data["text_end_sent"].append(sent_annotation.sentence_id_end)

    return pd.DataFrame(data)
