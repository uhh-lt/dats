from PIL.Image import Image

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch.index_image_document_in_faiss import load_image, image_encoder


def _load_image_with_sdoc_id(sdoc_id: int) -> Image:
    with SQLService().db_session() as db:
        sdoc = SourceDocumentRead.from_orm(crud_sdoc.read(db=db, id=sdoc_id))
        assert sdoc.doctype == DocType.image, f"SourceDocument with {sdoc_id=} is not an image!"

    img_p = RepoService().get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True)
    return load_image(img_p=img_p)


def find_similar_images_(proj_id: int, query: int, top_k: int):
    assert isinstance(query, int), "Query parameter is not an Integer!"
    # query is a sdoc id of an image sdoc, hence we need to load that image from disk first
    img = _load_image_with_sdoc_id(sdoc_id=query)
    encoded_query = image_encoder.encode(sentences=img,
                                         batch_size=1,
                                         show_progress_bar=False,
                                         normalize_embeddings=True,
                                         device="cpu")
    sdoc_ids_with_dists = FaissIndexService().search_index(proj_id=proj_id,
                                                           index_type=IndexType.IMAGE,
                                                           query=encoded_query,
                                                           top_k=top_k)
    return sdoc_ids_with_dists
