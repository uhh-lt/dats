from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def persist_sdoc_data(
    db: Session,
    sdoc_db_obj: SourceDocumentORM,
    pptd: PreProTextDoc,
    ppad: Optional[PreProAudioDoc] = None,
) -> None:
    additional_parameters = {}
    if ppad is not None:
        assert len(ppad.word_level_transcriptions) == len(
            pptd.token_character_offsets
        ), (
            "Expected audio word level transcriptions to be of same length as text tokens"
            f", but got {len(ppad.word_level_transcriptions)} and {len(pptd.token_character_offsets)} instead."
        )
        additional_parameters["token_time_starts"] = [
            t.start_ms for t in ppad.word_level_transcriptions
        ]
        additional_parameters["token_time_ends"] = [
            t.end_ms for t in ppad.word_level_transcriptions
        ]

    sdoc_data = SourceDocumentDataCreate(
        id=sdoc_db_obj.id,
        content=pptd.text,
        html=pptd.html,
        token_starts=[s for s, _ in pptd.token_character_offsets],
        token_ends=[e for _, e in pptd.token_character_offsets],
        sentence_starts=[s.start for s in pptd.sentences],
        sentence_ends=[s.end for s in pptd.sentences],
        **additional_parameters,
    )
    logger.info(f"{sdoc_data=}")
    crud_sdoc_data.create(db=db, create_dto=sdoc_data)
