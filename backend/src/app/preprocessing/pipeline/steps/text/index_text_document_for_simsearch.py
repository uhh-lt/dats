from app.core.search.simsearch_service import SimSearchService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from config import conf

sss = SimSearchService()

MIN_SENTENCE_LENGTH = conf.preprocessing.text.min_sentence_length


def index_text_document_for_simsearch(cargo: PipelineCargo) -> PipelineCargo:
    # assume that all PPTDs come from the same project!
    pptd: PreProTextDoc = cargo.data["pptd"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = pptd.project_id

    sentences = [
        sent.text
        for sent in pptd.sentences
        if len(sent.text.split(" ")) >= MIN_SENTENCE_LENGTH
    ]
    if len(sentences) > 0:
        sss.add_text_sdoc_to_index(
            proj_id=proj_id,
            sdoc_id=sdoc_id,
            sentences=sentences,
        )

    return cargo
