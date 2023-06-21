from pathlib import Path
from typing import List

from loguru import logger
from tqdm import tqdm

from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.dto.source_document import SDocStatus, SourceDocumentRead
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import persist_as_sdoc, update_sdoc_status

sql = SQLService(echo=False)
repo = RepoService()


def generate_and_import_transcript_file_(
    ppads: List[PreProAudioDoc],
) -> List[PreProTextDoc]:
    pptds = []
    for ppad in tqdm(
        ppads, desc="Create Transcript file and import file to database..."
    ):
        update_sdoc_status(
            sdoc_id=ppad.sdoc_id,
            sdoc_status=SDocStatus.create_transcript_file,
        )  # TODO: sdoc_id is not ideal

        transcription = " ".join([a.text for a in ppad.word_level_transcriptions])
        path_transcription = ppad.audio_dst.with_suffix(".transcription.txt")
        project_id = ppad.project_id
        mime_type = "text/plain"  # TODO: Use project enums

        try:
            with open(path_transcription, "w") as f:
                f.write(transcription)

        except IOError as e:
            logger.error(
                f"IOError while creating file {str(path_transcription)}. Errormsg: {e}"
            )
            raise e

        # Import transcript textfile to database and create pptd
        pptd = import_text_document_(
            doc_file_path=path_transcription, project_id=project_id, mime_type=mime_type
        )

        update_sdoc_status(
            sdoc_id=ppad.sdoc_id, sdoc_status=SDocStatus.finished
        )  # TODO: sdoc_id is not ideal
        # TODO: Setting the uncompressed audio to finished seems here the most correct place

        # Write filename and sdoc id to ppad
        ppad.transcript_sdoc_fn = pptd.filename
        ppad.transcript_sdoc_id = pptd.sdoc_id
        pptd = create_sdoc_link_pptd_(pptd=pptd, parent_source_document_id=ppad.sdoc_id)
        pptds.append(pptd)

    return pptds


# This is a slightly modified version of the image sdoc_link
def create_sdoc_link_pptd_(
    pptd: PreProTextDoc, parent_source_document_id: int
) -> PreProTextDoc:

    with sql.db_session() as db:
        create_dtos = [
            SourceDocumentLinkCreate(
                parent_source_document_id=parent_source_document_id,
                linked_source_document_filename=pptd.filename,
                linked_source_document_id=pptd.sdoc_id,
            )
        ]
        # persist the link
        crud_sdoc_link.create_multi(db=db, create_dtos=create_dtos)

        # Flo: update sdoc status
        update_sdoc_status(
            sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.create_sdoc_links_from_text
        )
    return pptd


# This is a copy from text.import_text_document. Only difference is that Tika is removed and a single object is returned
def import_text_document_(
    doc_file_path: Path, project_id: int, mime_type: str
) -> PreProTextDoc:
    # persist in db
    filepath, sdoc_db_obj = persist_as_sdoc(doc_file_path, project_id)

    # if it's not a raw text file, try to extract the content with Apache Tika and store it in a new raw text file

    # read sdoc from db
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)

    # read the content from disk
    with open(filepath, "r") as f:
        content = f.read()

    # create preprotextdoc
    pptd = PreProTextDoc(
        filename=sdoc_db_obj.filename,
        project_id=sdoc_db_obj.project_id,
        sdoc_id=sdoc_db_obj.id,
        text=content,
        html=content,
        mime_type=mime_type,
    )

    # extract general info
    pptd.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))

    # this step is finished
    update_sdoc_status(
        sdoc_id=sdoc_db_obj.id, sdoc_status=SDocStatus.import_text_document
    )
    return pptd
