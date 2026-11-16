import numpy as np

from core.doc.source_document_dto import SourceDocumentRead
from repos.filesystem_repo import FilesystemRepo
from repos.ray.dto.clip import ClipImageEmbeddingInput
from repos.ray.ray_repo import RayRepo
from utils.image_utils import image_to_base64, load_image


def encode_image(sdoc: SourceDocumentRead) -> np.ndarray:
    """The CLIP embedding of the image of the document, for the image
    embedding step and for a similarity search by an image."""
    image_fp = FilesystemRepo().get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)
    encoded = RayRepo().clip_image_embedding(
        ClipImageEmbeddingInput(base64_images=[image_to_base64(load_image(image_fp))])
    )
    return encoded.numpy().squeeze()
