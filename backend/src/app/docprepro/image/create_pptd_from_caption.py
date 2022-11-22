from typing import List

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status


def create_pptd_from_caption_(ppids: List[PreProImageDoc]) -> List[PreProTextDoc]:
    # Flo: create fake PPTDs to send them to the text worker to generate textual information and store in ES
    #  Note that this has to be in its own async callable function to enable modular celery calls w/o dependencies
    fake_pptds = [PreProTextDoc(filename=ppid.image_dst.name,
                                project_id=ppid.project_id,
                                sdoc_id=ppid.sdoc_id,
                                text=ppid.metadata["caption"],
                                html=ppid.metadata["caption"],
                                metadata={"language": "en"},
                                mime_type="text/plain")
                  for ppid in ppids]
    for fake_pptd in fake_pptds:
        update_sdoc_status(sdoc_id=fake_pptd.sdoc_id, sdoc_status=SDocStatus.create_pptd_from_caption)

    return fake_pptds
