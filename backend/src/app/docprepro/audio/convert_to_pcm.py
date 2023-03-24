import ffmpeg
from tqdm import tqdm

from typing import List
from loguru import logger

from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.db.sql_service import SQLService
from app.docprepro.audio.import_audio_document import import_audio_document_
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.util import update_sdoc_status

sql = SQLService(echo=False)

def convert_to_pcm_(ppads: List[PreProAudioDoc]) -> List[PreProAudioDoc]:
    for ppad in tqdm(ppads, desc="Converting mediafile to uncompressed wav"):
        update_sdoc_status(
            sdoc_id=ppad.sdoc_id,
            sdoc_status=SDocStatus.convert_mediafile_to_uncompressed_audio,
        )
        file_path = ppad.audio_dst
        wav_file = file_path.with_suffix(".wav")

        # Create 16khz Mono PCM File
        try:
            (
                ffmpeg.input(file_path)
                .output(str(wav_file), acodec="pcm_s16le", ac=1, ar="16k")
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            logger.error(e)

        ppad.uncompressed_fn = wav_file

        # Store file in database
        ppad_uncomp = import_audio_document_(wav_file, ppad.project_id, mime_type="audio/x-wav")[0] #TODO: Use project enums
        
        ppad.uncompressed_fn = ppad_uncomp.audio_dst
        ppad.uncompressed_sdoc_id = ppad_uncomp.sdoc_id

        # Create sdoc link
        create_sdoc_link_ppad_(ppad_uncomp, ppad.sdoc_id)

        # Update sdoc status of source document to finish
        # Robert: This is in my opinion the (actual) best place to set the finish status because now only the
        # new created uncompressed audiofile is used.
        update_sdoc_status(sdoc_id=ppad.sdoc_id, sdoc_status=SDocStatus.finished)

    return ppads

def create_sdoc_link_ppad_(ppad: PreProAudioDoc, parent_source_document_id: int) -> PreProAudioDoc:

    with sql.db_session() as db:
        create_dtos = [SourceDocumentLinkCreate(parent_source_document_id=parent_source_document_id,
                                                linked_source_document_filename=str(ppad.audio_dst),
                                                linked_source_document_id=ppad.sdoc_id)]
        # Persist the link
        crud_sdoc_link.create_multi(db=db, create_dtos=create_dtos)

        # Update sdoc status
        update_sdoc_status(sdoc_id=ppad.sdoc_id, sdoc_status=SDocStatus.create_sdoc_links_from_audio)