from common.crud_enum import Crud
from repos.filesystem.file_crud_base import FileCRUDBase

# the audio stream extracted from a video document
AUDIO_FILENAME = "audio.mp3"


class CRUDAudioFile(FileCRUDBase):
    """The audio stream of a video document: `audio/<sdoc_id>/audio.mp3`. The
    audio stream of an audio document is its uploaded file (`crud_sdoc_file`)."""

    folder = "audio"
    entity = Crud.SOURCE_DOCUMENT


crud_audio_file = CRUDAudioFile()
