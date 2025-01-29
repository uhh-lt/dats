from typing import List, Optional

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_data import SourceDocumentDataRead
from app.core.data.dto.user import UserRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.span_annotation import SpanAnnotationORM


def generate_export_df_for_adoc(
    db: Session,
    adoc_id: Optional[int] = None,
    adoc: Optional[AnnotationDocumentORM] = None,
) -> pd.DataFrame:
    # fill the DataFrame
    data = {
        "sdoc_name": [],
        "user_email": [],
        "user_first_name": [],
        "user_last_name": [],
        "code_name": [],
        "created": [],
        "text": [],
        "text_begin_char": [],
        "text_end_char": [],
        "text_begin_token": [],
        "text_end_token": [],
        "text_begin_sent": [],
        "text_end_sent": [],
        "bbox_x_min": [],
        "bbox_x_max": [],
        "bbox_y_min": [],
        "bbox_y_max": [],
    }

    if adoc is None and adoc_id is not None:
        adoc = crud_adoc.read(db=db, id=adoc_id)

    if adoc:
        logger.info(f"Exporting AnnotationDocument {adoc_id} ...")
        # get the adoc, proj, sdoc, user, and all annos
        user_dto = UserRead.model_validate(adoc.user)
        sdoc_dto = SourceDocumentRead.model_validate(adoc.source_document)
        sdoc_data_dto = SourceDocumentDataRead.model_validate(adoc.source_document.data)

        # span annos
        for span in adoc.span_annotations:
            data["sdoc_name"].append(sdoc_dto.filename)

            data["user_email"].append(user_dto.email)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)

            data["code_name"].append(span.code.name)
            data["created"].append(span.created)

            data["text"].append(span.text)

            data["text_begin_char"].append(span.begin)
            data["text_end_char"].append(span.end)
            data["text_begin_token"].append(span.begin_token)
            data["text_end_token"].append(span.end_token)

            data["text_begin_sent"].append(None)
            data["text_end_sent"].append(None)

            data["bbox_x_min"].append(None)
            data["bbox_x_max"].append(None)
            data["bbox_y_min"].append(None)
            data["bbox_y_max"].append(None)

        # sent annos
        for sent_anno in adoc.sentence_annotations:
            data["sdoc_name"].append(sdoc_dto.filename)

            data["user_email"].append(user_dto.email)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)

            data["code_name"].append(sent_anno.code.name)
            data["created"].append(sent_anno.created)

            data["text"].append(
                " ".join(
                    sdoc_data_dto.sentences[
                        sent_anno.sentence_id_start : sent_anno.sentence_id_end + 1
                    ]
                )
            )

            data["text_begin_char"].append(None)
            data["text_end_char"].append(None)
            data["text_begin_token"].append(None)
            data["text_end_token"].append(None)

            data["text_begin_sent"].append(sent_anno.sentence_id_start)
            data["text_end_sent"].append(sent_anno.sentence_id_end)

            data["bbox_x_min"].append(None)
            data["bbox_x_max"].append(None)
            data["bbox_y_min"].append(None)
            data["bbox_y_max"].append(None)

        # bbox annos
        for bbox in adoc.bbox_annotations:
            data["sdoc_name"].append(sdoc_dto.filename)

            data["user_email"].append(user_dto.email)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)

            data["code_name"].append(bbox.code.name)
            data["created"].append(bbox.created)

            data["text"].append(None)

            data["text_begin_char"].append(None)
            data["text_end_char"].append(None)
            data["text_begin_token"].append(None)
            data["text_end_token"].append(None)

            data["text_begin_sent"].append(None)
            data["text_end_sent"].append(None)

            data["bbox_x_min"].append(bbox.x_min)
            data["bbox_x_max"].append(bbox.x_max)
            data["bbox_y_min"].append(bbox.y_min)
            data["bbox_y_max"].append(bbox.y_max)
    else:
        logger.info("Init empty annotation export document ...")

    df = pd.DataFrame(data=data)
    return df


def generate_export_df_for_span_annotations(
    db: Session,
    span_annotations: List[SpanAnnotationORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(span_annotations)} Annotations ...")

    # fill the DataFrame
    data = {
        "sdoc_name": [],
        "user_email": [],
        "user_first_name": [],
        "user_last_name": [],
        "code_name": [],
        "created": [],
        "text": [],
        "text_begin_char": [],
        "text_end_char": [],
    }

    for span in span_annotations:
        sdoc = span.annotation_document.source_document
        user = span.annotation_document.user
        data["sdoc_name"].append(sdoc.filename)
        data["user_email"].append(user.email)
        data["user_first_name"].append(user.first_name)
        data["user_last_name"].append(user.last_name)
        data["code_name"].append(span.code.name)
        data["created"].append(span.created)
        data["text"].append(span.text)
        data["text_begin_char"].append(span.begin)
        data["text_end_char"].append(span.end)

    df = pd.DataFrame(data=data)
    return df


def generate_export_df_for_sentence_annotations(
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

    df = pd.DataFrame(data=data)
    return df
