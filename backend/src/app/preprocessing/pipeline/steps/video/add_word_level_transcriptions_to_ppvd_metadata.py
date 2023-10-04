import json

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc


def add_word_level_transcriptions_to_ppvd_metadata(
    cargo: PipelineCargo,
) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]
    ppad: PreProAudioDoc = cargo.data["ppad"]

    # store word level transcriptions as metadata
    wlt = list(map(lambda wlt: wlt.dict(), ppad.word_level_transcriptions))
    ppvd.metadata["word_level_transcriptions"] = json.dumps(wlt)

    return cargo
