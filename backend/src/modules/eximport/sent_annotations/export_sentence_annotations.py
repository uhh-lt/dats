from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.doc.source_document_crud import crud_sdoc
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.sent_annotations.sentence_annotations_export_schema import (
    SentenceAnnotationExportCollection,
    SentenceAnnotationExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_selected_sentence_annotations(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    sentence_annotation_ids: list[int],
) -> Path:
    sentence_annotations = crud_sentence_anno.read_by_ids(
        db=db, ids=sentence_annotation_ids
    )
    return __export_sentence_annotations(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_sentence_annotations",
        sentence_annotations=sentence_annotations,
    )


def export_all_sentence_annotations(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    sentence_annotations = crud_sentence_anno.read_by_project(
        db=db, project_id=project_id
    )
    return __export_sentence_annotations(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_sentence_annotations",
        sentence_annotations=sentence_annotations,
    )


def __export_sentence_annotations(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    sentence_annotations: list[SentenceAnnotationORM],
) -> Path:
    if len(sentence_annotations) == 0:
        raise NoDataToExportError("No sentence annotations to export.")

    export_data = __generate_export_df_for_sentence_annotations(
        db=db, sentence_annotations=sentence_annotations
    )
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_sentence_annotations(
    db: Session,
    sentence_annotations: list[SentenceAnnotationORM],
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
