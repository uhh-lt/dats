from typing import List

from bs4 import BeautifulSoup
from tqdm import tqdm

from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.db.sql_service import SQLService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status

sql = SQLService(echo=False)


def create_sdoc_links_from_html_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    with sql.db_session() as db:
        for pptd in tqdm(pptds, desc="Creating sdoc links... "):
            soup = BeautifulSoup(pptd.html, "html.parser")
            img_links = soup.findAll("img")

            img_srcs = list(set([img["src"].strip() for img in img_links if "src" in img]))
            for img_src in img_srcs:
                create_dto = SourceDocumentLinkCreate(parent_source_document_id=pptd.sdoc_id,
                                                      linked_source_document_filename=img_src)

                # persist the link
                crud_sdoc_link.create(db=db, create_dto=create_dto)

            # Flo: update sdoc status
            update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.create_sdoc_links_from_html)

    return pptds
