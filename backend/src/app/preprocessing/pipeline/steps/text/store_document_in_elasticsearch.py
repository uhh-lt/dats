from app.core.data.dto.search import (
    ElasticSearchDocumentCreate,
)
from app.core.db.elasticsearch_service import ElasticSearchService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

es = ElasticSearchService()


def store_document_in_elasticsearch(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    sdoc_id = cargo.data["sdoc_id"]
    # Flo: we assume that every pptd originates from the same project!
    proj_id = pptd.project_id

    esdoc = ElasticSearchDocumentCreate(
        filename=pptd.filename,
        content=pptd.text,
        sdoc_id=sdoc_id,
        project_id=pptd.project_id,
    )

    es.add_document_to_index(proj_id=proj_id, esdoc=esdoc)

    return cargo
