from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.sent_annotations.sentence_annotations_export_schema import (
    SentenceAnnotationExportCollection,
    SentenceAnnotationExportSchema,
)
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


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
        fn=f"project_{project_id}_selected_sentence_annotations",
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
        fn=f"project_{project_id}_all_sentence_annotations",
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

    # Create annotations using our schema
    annotation_export_items = []
    for sent_annotation in sentence_annotations:
        sdoc = sent_annotation.annotation_document.source_document
        user = sent_annotation.annotation_document.user
        sdata = sdoc_data[sdoc.id]

        # Extract text from sentences if possible
        text = None
        if sdata and hasattr(sdata, "sentences"):
            text = " ".join(
                sdata.sentences[
                    sent_annotation.sentence_id_start : sent_annotation.sentence_id_end
                    + 1
                ]
            )

        annotation_export_items.append(
            SentenceAnnotationExportSchema(
                uuid=sent_annotation.uuid,
                sdoc_name=sdoc.filename,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name,
                code_name=sent_annotation.code.name,
                text=text,
                text_begin_sent=sent_annotation.sentence_id_start,
                text_end_sent=sent_annotation.sentence_id_end,
            )
        )

    collection = SentenceAnnotationExportCollection(annotations=annotation_export_items)
    return collection.to_dataframe()
