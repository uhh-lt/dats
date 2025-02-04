from app.core.db.simsearch_service import SimSearchService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

sss = SimSearchService()


def index_image_document_for_simsearch(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = ppid.project_id

    sss.add_image_sdoc_to_index(
        sdoc_id=sdoc_id,
        proj_id=proj_id,
    )

    return cargo
