from collections import Counter
from typing import Dict, List, Tuple

import spacy
from app.core.data.dto.source_document import SDocStatus
from app.docprepro.text.models.autospan import AutoSpan
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status
from config import conf
from loguru import logger
from spacy import Language
from spacy.tokens import Doc
from tqdm import tqdm

BULK_THRESHOLD = conf.docprepro.text.bulk_threshold


def __load_spacy_models() -> Dict[str, Language]:
    if conf.docprepro.text.spacy.device == "cuda":
        spacy.prefer_gpu()

    logger.info(f"Starting to load spaCy Models...")

    nlp: Dict[str, Language] = dict()

    for lang, model in conf.docprepro.text.spacy.models.items():
        if lang == "default":
            continue
        logger.info(f"Loading spaCy Model '{model}' ...")
        nlp[lang] = spacy.load(model)

    logger.info(f"Starting to load spaCy Models... Done!")

    nlp["default"] = nlp[conf.docprepro.text.spacy.models.default]

    for lang in nlp.values():
        lang.max_length = conf.docprepro.text.spacy.max_text_length

    return nlp


spacy_models = __load_spacy_models()


def generate_span_annotations_single_pptd(
    doc: Doc, pptd: PreProTextDoc
) -> PreProTextDoc:
    # add tokens, lemma, POS, and stopword; count word frequencies
    # TODO Flo: Do we want these as Codes/AutoSpans ?
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

    # create AutoSpans for NER
    for ne in doc.ents:
        auto = AutoSpan(
            code=f"{ne.label_}",
            start=ne.start_char,
            end=ne.end_char,
            text=ne.text,
            start_token=ne.start,
            end_token=ne.end,
        )
        if auto.code not in pptd.spans:
            pptd.spans[auto.code] = list()
        pptd.spans[auto.code].append(auto)

    # create AutoSpans for Sentences
    pptd.sentences = list()
    for s in doc.sents:
        auto = AutoSpan(
            code="SENTENCE",
            start=s.start_char,
            end=s.end_char,
            text=s.text,
            start_token=s.start,
            end_token=s.end,
        )
        pptd.sentences.append(auto)

    # Flo: update sdoc status
    update_sdoc_status(
        sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.generate_span_annotations
    )

    return pptd


def generate_span_annotations_sequentially(
    pptds: List[PreProTextDoc],
) -> List[PreProTextDoc]:
    logger.info(
        f"Generating Automatic Span Annotations in spaCy sequential Mode for {len(pptds)} Documents..."
    )

    for pptd in tqdm(
        pptds, desc="Generating Automatic Span Annotations in spaCy sequential Mode... "
    ):
        # Flo: use the language specific model for each pptd
        model = (
            spacy_models[pptd.metadata["language"]]
            if pptd.metadata["language"] in spacy_models
            else spacy_models["default"]
        )
        doc: Doc = model(pptd.text)
        # Flo: generate the automatic span annotations
        pptd = generate_span_annotations_single_pptd(doc=doc, pptd=pptd)

    return pptds


def generate_span_annotations_pipeline(
    pptds: List[PreProTextDoc],
) -> List[PreProTextDoc]:
    logger.info(
        f"Generating Automatic Span Annotations in spaCy Pipeline Mode for {len(pptds)} Documents..."
    )

    # Flo: first we have to sort the PreProTextDoc by language and extract the text from the pptds that we want to
    #  use with the models
    pptds_data: Dict[str, List[Tuple[str, PreProTextDoc]]] = {
        lang: [] for lang in spacy_models.keys()
    }
    for pptd in pptds:
        pptd_lang = (
            pptd.metadata["language"]
            if pptd.metadata["language"] in spacy_models
            else "default"
        )
        pptds_data[pptd_lang].append((pptd.text, pptd))

    # Flo: now apply language specific model in pipeline mode
    for lang, model in spacy_models.items():
        for doc, pptd in tqdm(
            model.pipe(pptds_data[lang], as_tuples=True),
            total=len(pptds_data[lang]),
            desc="Generating Automatic Span Annotations in spaCy Pipeline Mode... ",
        ):
            generate_span_annotations_single_pptd(doc=doc, pptd=pptd)

    return pptds


def generate_span_annotations_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    # Flo: SDoc Status is updated in util methods
    if len(pptds) < BULK_THRESHOLD:
        return generate_span_annotations_sequentially(pptds)
    return generate_span_annotations_pipeline(pptds)
