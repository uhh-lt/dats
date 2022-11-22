import json
from typing import List

from tqdm import tqdm

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.db.sql_service import SQLService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status

sql = SQLService()


def store_metadata_in_db_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    with sql.db_session() as db:
        for pptd in tqdm(pptds, desc="Persisting Metadata... "):
            for key, value in pptd.metadata.items():
                lang_metadata_create_dto = SourceDocumentMetadataCreate(key=key,
                                                                        value=value,
                                                                        source_document_id=pptd.sdoc_id,
                                                                        read_only=True)

                crud_sdoc_meta.create(db=db, create_dto=lang_metadata_create_dto)

            # persist word frequencies
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="word_frequencies",
                                                                value=json.dumps(pptd.word_freqs).replace("\"", "'"),
                                                                source_document_id=pptd.sdoc_id,
                                                                read_only=True)

            crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

            # Flo: update sdoc status
            update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.store_metadata_in_db)

    return pptds
