import os
from pathlib import Path
from typing import Tuple, List

from loguru import logger
from tika import parser

from app.core.data.dto.source_document import SourceDocumentRead, SDocStatus
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status, persist_as_sdoc

# TODO Flo: Do we want this in the config ?
TIKA_SUPPORTED_FILE_EXTENSIONS = ['.docx', '.doc', '.pdf']


def __start_apache_tika_server() -> None:
    logger.info("Starting Apache Tika Server...")
    # start by parsing a random text file (hacky, I know...)
    from tika import parser
    tika_starter_dummy = "/tmp/tika_starter_dummy.txt"
    with open(tika_starter_dummy, 'w') as f:
        f.write("tika_starter_dummy")
    parser.from_file(tika_starter_dummy)
    os.remove(tika_starter_dummy)
    logger.info("Starting Apache Tika Server... Done!")


__start_apache_tika_server()


def create_document_content_html_file_via_tika(filepath: Path,
                                               sdoc_db_obj: SourceDocumentORM) -> Tuple[Path, SourceDocumentORM]:
    logger.info(f"Extracting html content via Tika from {filepath.name} for SourceDocument {sdoc_db_obj.id}...")
    if filepath.suffix not in TIKA_SUPPORTED_FILE_EXTENSIONS:
        raise NotImplementedError(f"File Extension {filepath.suffix} are not supported!")

    parsed = parser.from_file(filename=str(filepath), xmlContent=True)

    if not int(parsed['status']) == 200:
        logger.warning(f"Couldn't get html content via Tika from {filepath}!")
        content = ""
    else:
        content = parsed['content'].strip()

    # create a html file with the textual content
    html_filename = filepath.parent.joinpath(f"{filepath.stem}.html")
    with open(html_filename, 'w') as html_file:
        html_file.write(content)
    logger.info(f"Created html file with content from {filepath.name} for SourceDocument {sdoc_db_obj.id}!")

    return html_filename, sdoc_db_obj


def import_text_document_(doc_file_path: Path, project_id: int, mime_type: str) -> List[PreProTextDoc]:
    # persist in db
    filepath, sdoc_db_obj = persist_as_sdoc(doc_file_path, project_id)

    # if it's not a raw text file, try to extract the content with Apache Tika and store it in a new raw text file
    if filepath.suffix in TIKA_SUPPORTED_FILE_EXTENSIONS:
        filepath, sdoc_db_obj = create_document_content_html_file_via_tika(filepath=filepath, sdoc_db_obj=sdoc_db_obj)
        mime_type = "text/html"

    # read sdoc from db
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)

    # read the content from disk
    with open(filepath, "r") as f:
        content = f.read()

    # create preprotextdoc
    pptd = PreProTextDoc(filename=sdoc_db_obj.filename,
                         project_id=sdoc_db_obj.project_id,
                         sdoc_id=sdoc_db_obj.id,
                         text=content,
                         html=content,
                         mime_type=mime_type)

    # extract general info
    pptd.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))

    # this step is finished
    update_sdoc_status(sdoc_id=sdoc_db_obj.id, sdoc_status=SDocStatus.import_text_document)
    return [pptd]
