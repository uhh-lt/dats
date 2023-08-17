from collections import Counter

from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def generate_word_frequncies(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    doc = pptd.spacy_doc
    if doc is None:
        logger.error(
            f"spaCy Doc is None for {pptd.filename}! Please run the spaCy pipeline first!"
        )
        return cargo

    pptd.word_freqs = Counter()
    for token in doc:
        pptd.tokens.append(token.text)
        pptd.token_character_offsets.append((token.idx, token.idx + len(token)))
        pptd.pos.append(token.pos_)
        pptd.lemmas.append(token.lemma_)
        pptd.stopwords.append(token.is_stop)

        if not (token.is_stop or token.is_punct) and (token.is_alpha or token.is_digit):
            pptd.word_freqs.update((token.text,))

    # sort the word freqs!
    pptd.word_freqs = {
        k: v
        for (k, v) in sorted(pptd.word_freqs.items(), key=lambda i: i[1], reverse=True)
    }
    # use top-5 as keywords
    pptd.keywords = list(pptd.word_freqs.keys())[:5]

    return cargo
