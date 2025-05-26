from app.core.ml.embedding_service import EmbeddingService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

emb = EmbeddingService()


def index_text_document_for_simsearch(cargo: PipelineCargo) -> PipelineCargo:
    # assume that all PPTDs come from the same project!
    pptd: PreProTextDoc = cargo.data["pptd"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = pptd.project_id

    sentences = [sent.text for sent in pptd.sentences]
    if len(sentences) > 0:
        emb.add_text_sdoc_to_index(
            proj_id=proj_id,
            sdoc_id=sdoc_id,
            sentences=sentences,
            text=pptd.text,
        )

    return cargo
