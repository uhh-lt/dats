from common.job_type import JobType
from core.doc.sdoc_elastic_crud import crud_elastic_sdoc
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.source_document_data_crud import crud_sdoc_data
from repos.db.sql_repo import SQLRepo
from repos.elastic.elastic_repo import ElasticSearchRepo
from systems.job_system.job_dto import Job, SdocJobInput
from systems.job_system.job_register_decorator import register_job


class ESIndexJobInput(SdocJobInput):
    filename: str | None
    text: str | None


@register_job(
    job_type=JobType.ES_INDEX,
    input_type=ESIndexJobInput,
)
def handle_es_index_job(payload: ESIndexJobInput, job: Job) -> None:
    # if we re-run this job, filename and text is None, we need to query it from db
    with SQLRepo().db_session() as db:
        if payload.filename is None or payload.text is None:
            sdoc_data = crud_sdoc_data.read(db=db, id=payload.sdoc_id)
            payload.text = sdoc_data.content
            payload.filename = sdoc_data.source_document.filename

        esdoc = ElasticSearchDocumentCreate(
            filename=payload.filename,
            content=payload.text,
            sdoc_id=payload.sdoc_id,
            project_id=payload.project_id,
        )

        crud_elastic_sdoc.create(
            client=ElasticSearchRepo().client,
            create_dto=esdoc,
            proj_id=payload.project_id,
        )
