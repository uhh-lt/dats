from app.core.data.dto.search import (
    ElasticSearchDocumentCreate,
    ElasticSearchIntegerRange,
)
from app.core.search.elasticsearch_service import ElasticSearchService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from config import conf

BULK_THRESHOLD = conf.preprocessing.text.bulk_threshold
es = ElasticSearchService()


def store_document_in_elasticsearch(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    sdoc_id = cargo.data["sdoc_id"]
    # Flo: we assume that every pptd originates from the same project!
    proj_id = pptd.project_id

    esdoc = ElasticSearchDocumentCreate(
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
            ElasticSearchIntegerRange(gte=s.start, lt=s.end) for s in pptd.sentences
        ],
        keywords=pptd.keywords,
        sdoc_id=sdoc_id,
        project_id=pptd.project_id,
    )

    es.add_document_to_index(proj_id=proj_id, esdoc=esdoc)

    return cargo
