from sqlalchemy.orm import Session

from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def persist_sdoc_data(
    db: Session, sdoc_db_obj: SourceDocumentORM, pptd: PreProTextDoc
) -> None:
    sdoc_data = SourceDocumentDataCreate(
        id=sdoc_db_obj.id,
        content=pptd.text,
        html=pptd.html,
        token_starts=[s for s, _ in pptd.token_character_offsets],
        token_ends=[e for _, e in pptd.token_character_offsets],
        sentence_starts=[s.start for s in pptd.sentences],
        sentence_ends=[s.end for s in pptd.sentences],
    )
    crud_sdoc_data.create(db=db, create_dto=sdoc_data)
