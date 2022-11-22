from typing import List

from PIL import Image
from tqdm import tqdm

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.db.sql_service import SQLService
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.util import update_sdoc_status
from config import conf

sql = SQLService(echo=False)


def generate_image_captions_(ppids: List[PreProImageDoc], image_captioning_feature_extractor, image_captioning_model,
                             image_captioning_tokenizer) -> List[PreProImageDoc]:
    device = conf.docprepro.image.image_captioning.device

    with tqdm(total=len(ppids), desc="Generating automatic image captions...") as pbar:
        images: List[Image] = []
        for ppid in ppids:
            # Flo: open the images to create an image batch for faster forwarding
            img = Image.open(ppid.image_dst)
            if img.mode != "RGB":
                img = img.convert("RGB")
            images.append(img)

        pixel_values = image_captioning_feature_extractor(images=images, return_tensors="pt").pixel_values.to(device)

        # Flo: close the images again
        for img in images:
            img.close()

        max_caption_length = conf.docprepro.image.image_captioning.max_caption_length
        num_beams = conf.docprepro.image.image_captioning.num_beams
        output_ids = image_captioning_model.generate(pixel_values, max_length=max_caption_length, num_beams=num_beams)

        captions = image_captioning_tokenizer.batch_decode(output_ids, skip_special_tokens=True)
        captions = [cap.strip() for cap in captions]

        # create metadata holding the captions
        with sql.db_session() as db:
            for ppid, cap in zip(ppids, captions):
                sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="caption",
                                                                    value=cap,
                                                                    source_document_id=ppid.sdoc_id,
                                                                    read_only=True)
                # persist SourceDocumentMetadata

                crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

                ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

                update_sdoc_status(sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.generate_image_captions)
                pbar.update(1)

    return ppids
