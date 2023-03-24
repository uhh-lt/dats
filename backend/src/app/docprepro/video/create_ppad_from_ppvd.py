from typing import List

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.video.models.preprovideodoc import PreProVideoDoc
from app.docprepro.util import update_sdoc_status


def create_ppad_from_ppvd_(ppvds: List[PreProVideoDoc]) -> List[PreProAudioDoc]:
    # Flo: create fake PPADs to send them to the text worker to generate textual information and store in ES
    #  Note that this has to be in its own async callable function to enable modular celery calls w/o dependencies
    fake_ppads = [
        PreProAudioDoc(
            audio_dst=ppvd.video_dst,
            project_id=ppvd.project_id,
            mime_type=ppvd.mime_type,  # TODO: This is not good.
            sdoc_id=ppvd.sdoc_id,
            metadata=ppvd.metadata,
        )  # TODO: This also.
        for ppvd in ppvds
    ]
    for fake_ppad in fake_ppads:
        update_sdoc_status(
            sdoc_id=fake_ppad.sdoc_id, sdoc_status=SDocStatus.create_ppad_from_ppvd
        )

    return fake_ppads
