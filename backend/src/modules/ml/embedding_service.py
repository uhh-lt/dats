import numpy as np

from common.doc_type_enum import DocType
from common.singleton_meta import SingletonMeta
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.source_document_dto import SourceDocumentRead
from repos.filesystem_repo import FilesystemRepo
from repos.llm_repo import LLMRepo
from repos.ray.dto.clip import ClipImageEmbeddingInput, ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo
from utils.image_utils import image_to_base64, load_image


class EmbeddingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr = FilesystemRepo()
        cls.ray: RayRepo = RayRepo()
        cls.llm: LLMRepo = LLMRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(EmbeddingService, cls).__new__(cls)

    def encode_document(self, text: str) -> np.ndarray:
        return self.llm.llm_embed([text])

    def encode_sentences(self, sentences: list[str]) -> np.ndarray:
        encoded_query = self.ray.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        return encoded_query.numpy()

    def encode_image(self, sdoc: SourceDocumentRead) -> np.ndarray:
        assert sdoc.doctype == DocType.image, (
            f"SourceDocument with {sdoc.id} is not an image!"
        )

        image_fp = self.fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)
        image = load_image(image_fp)
        base64_image = image_to_base64(image)

        encoded_query = self.ray.clip_image_embedding(
            ClipImageEmbeddingInput(
                base64_images=[base64_image],
            )
        )
        return encoded_query.numpy().squeeze()

    def embed_document(self, *, project_id: int, sdoc_id: int, text: str) -> None:
        """Embed the text of a document and store it in the Document collection,
        replacing the document's previous embedding."""
        embedding = self.encode_document(text).tolist()[0]
        crud_document_embedding.create_multi(
            client=self.weaviate.get_client(),
            project_id=project_id,
            ids=[DocumentObjectIdentifier(sdoc_id=sdoc_id)],
            embeddings=[embedding],
        )
