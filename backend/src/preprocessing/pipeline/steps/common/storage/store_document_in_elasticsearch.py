from core.doc.sdoc_elastic_crud import crud_elastic_sdoc
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from repos.elastic.elastic_repo import ElasticSearchRepo

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

    crud_elastic_sdoc.create(
        client=es.client,
        create_dto=esdoc,
        proj_id=proj_id,
    )

    return cargo
