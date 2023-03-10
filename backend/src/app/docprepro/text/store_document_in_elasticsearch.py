from typing import List

from tqdm import tqdm

from app.core.data.dto.search import (
    ElasticSearchDocumentCreate,
    ElasticSearchIntegerRange,
)
from app.core.data.dto.source_document import SDocStatus
from app.core.search.elasticsearch_service import ElasticSearchService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status
from config import conf

BULK_THRESHOLD = conf.docprepro.text.bulk_threshold
es = ElasticSearchService()


def store_document_in_elasticsearch_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    # Flo: we assume that every pptd originates from the same project!
    proj_id = pptds[0].project_id

    esdocs = list(
        map(
            lambda pptd: ElasticSearchDocumentCreate(
                filename=pptd.filename,
                content=pptd.text,
                html=pptd.html,
                tokens=pptd.tokens,
                token_character_offsets=[
                    ElasticSearchIntegerRange(gte=o[0], lt=o[1])
                    for o in pptd.token_character_offsets
                ],
                sentences=[s.text for s in pptd.sentences],
                sentence_character_offsets=[
                    ElasticSearchIntegerRange(gte=s.start, lt=s.end)
                    for s in pptd.sentences
                ],
                keywords=pptd.keywords,
                sdoc_id=pptd.sdoc_id,
                project_id=pptd.project_id,
            ),
            pptds,
        )
    )
    if len(pptds) <= BULK_THRESHOLD:
        for esdoc in tqdm(esdocs, desc="Adding documents to ElasticSearch... "):
            es.add_document_to_index(proj_id=proj_id, esdoc=esdoc)

            # Flo: update sdoc status
            update_sdoc_status(
                sdoc_id=esdoc.sdoc_id,
                sdoc_status=SDocStatus.store_document_in_elasticsearch,
            )
    else:

        es.bulk_add_documents_to_index(proj_id=proj_id, esdocs=esdocs)

        # Flo: update sdoc status
        for pptd in pptds:
            update_sdoc_status(
                sdoc_id=pptd.sdoc_id,
                sdoc_status=SDocStatus.store_document_in_elasticsearch,
            )

    return pptds
