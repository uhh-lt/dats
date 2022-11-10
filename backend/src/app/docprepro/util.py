from pathlib import Path
from typing import Tuple, List

from bs4 import BeautifulSoup
from fastapi import UploadFile

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import get_doc_type, DocType, is_archive_file
from app.core.data.dto.source_document import SDocStatus, SourceDocumentHTML
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.docprepro.archive import import_uploaded_archive_apply_async
from app.docprepro.image import image_document_preprocessing_apply_async
from app.docprepro.text import text_document_preprocessing_apply_async
from config import conf

cc = conf.docprepro.celery
sql = SQLService()
repo = RepoService()


def preprocess_uploaded_file(proj_id: int, uploaded_file: UploadFile) -> None:
    # Flo: For some magical reason we have to update celery configs here again. Most probably because FastAPI or
    #  Starlette reset kombu serialization settings which in turn affects the celery worker configs. Another issue
    #  might be that we're launching this in as a BackgroundTask (i.e. in a separate Process or Thread)
    # FIXME Flo: this still doesnt work although the settings are updated!
    # celery_prepro_worker.conf.update(**CeleryConfig().to_dict())

    file_path = repo.store_uploaded_file_in_project_repo(proj_id=proj_id, uploaded_file=uploaded_file)
    doc_type = get_doc_type(mime_type=uploaded_file.content_type)
    if doc_type == DocType.text:
        text_document_preprocessing_apply_async(doc_file_path=file_path, project_id=proj_id)
    elif doc_type == DocType.image:
        image_document_preprocessing_apply_async(doc_file_path=file_path, project_id=proj_id)
    elif is_archive_file(uploaded_file.content_type):
        import_uploaded_archive_apply_async(archive_file_path=file_path, project_id=proj_id)


def persist_as_sdoc(doc_file_path: Path,
                    project_id: int) -> Tuple[Path, SourceDocumentORM]:
    # generate the create_dto
    dst, create_dto = repo.build_source_document_create_dto_from_file(proj_id=project_id,
                                                                      filename=doc_file_path.name)
    # persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return dst, sdoc_db_obj


def update_sdoc_status(sdoc_id: int, sdoc_status: SDocStatus) -> SourceDocumentORM:
    # update status
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.update_status(db=db,
                                              sdoc_id=sdoc_id,
                                              sdoc_status=sdoc_status)
    return sdoc_db_obj


def update_es_sdoc_html_with_resolved_links(resolved_links: List[SourceDocumentLinkORM], proj_id: int) -> None:
    if len(resolved_links) == 0:
        return

    parent_sdoc_ids = set(link.parent_source_document_id for link in resolved_links)

    # get html via sdoc id
    sdoc_id_to_soup_map = dict()
    for sdoc_id in parent_sdoc_ids:
        sdoc_html = ElasticSearchService().get_sdoc_html_by_sdoc_id(sdoc_id=sdoc_id,
                                                                    proj_id=proj_id).html
        sdoc_id_to_soup_map[sdoc_id] = BeautifulSoup(sdoc_html, "html.parser")

    # parse html to find the images
    src_to_tag_map = dict()
    for link in resolved_links:
        soup = sdoc_id_to_soup_map[link.parent_source_document_id]
        img_links = soup.findAll("img")
        for img in img_links:
            src_to_tag_map[img["src"]] = img

    # replace img src filename with custom sdoc id attribute with resolved sdoc id
    for link in resolved_links:
        tag = src_to_tag_map[link.linked_source_document_filename]
        tag["sdocId"] = link.linked_source_document_id

    # save updated html in es
    for sdoc_id, soup in sdoc_id_to_soup_map.items():
        ElasticSearchService().update_sdoc_html_by_sdoc_id(proj_id=proj_id,
                                                           sdoc_html=SourceDocumentHTML(source_document_id=sdoc_id,
                                                                                        html=str(soup)))
