from collections import Counter
from typing import Optional

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger


def generate_word_frequncies(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    ppad: Optional[PreProAudioDoc] = (
        cargo.data["ppad"] if "ppad" in cargo.data else None
    )
    out = pptd.spacy_pipeline_output

    if out is None:
        logger.error(
            f"spaCy PipelineOutput is None for {pptd.filename}! Please run the spaCy pipeline first!"
        )
        return cargo

    pptd.word_freqs = Counter()
    if not ppad or ppad.tokens is None or ppad.token_character_offsets is None:
        for token in out.tokens:
            pptd.tokens.append(token.text)
            pptd.token_character_offsets.append((token.start_char, token.end_char))
            # pptd.pos.append(token.pos)
            # pptd.lemmas.append(token.lemma)
            # pptd.stopwords.append(token.is_stopword)
            if not (token.is_stopword or token.is_punctuation) and (
                token.is_alpha or token.is_digit
            ):
                pptd.word_freqs.update((token.text,))

    else:
        pptd.tokens = ppad.tokens
        pptd.token_character_offsets = ppad.token_character_offsets
        # TODO: What are stopwords and punctuations and so on?

    # sort the word freqs!
    pptd.word_freqs = {
        k: v
        for (k, v) in sorted(pptd.word_freqs.items(), key=lambda i: i[1], reverse=True)
    }

    return cargo
