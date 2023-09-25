import numpy as np
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import ClipImageEmbeddingInput

faisss = FaissIndexService()
rms = RayModelService()


def index_image_in_faiss(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = ppid.project_id

    encoded_images = rms.clip_image_embedding(
        ClipImageEmbeddingInput(image_fps=[str(ppid.filepath)])
    )

    # add to index (with the IDs of the SDocs)
    faisss.add_to_index(
        embeddings=encoded_images.numpy(),
        embedding_ids=np.asarray([sdoc_id]),
        proj_id=proj_id,
        index_type=IndexType.IMAGE,
    )

    return cargo
