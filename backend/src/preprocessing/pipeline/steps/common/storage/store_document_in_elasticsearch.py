from modules.search.search_dto import ElasticSearchDocumentCreate
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from repos.elasticsearch_repo import ElasticSearchRepo

es = ElasticSearchRepo()


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
