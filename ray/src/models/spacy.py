import logging
import re

import spacy
from ray import serve
from spacy.language import Language
from spacy.tokens import Doc

from config import build_ray_model_deployment_config, conf
from dto.spacy import SpacyInput, SpacyPipelineOutput, SpacySpan, SpacyToken
from utils import init_glitchtip

cc = conf.spacy

DEVICE = str(cc.device)
MODEL_DIR = cc.model_dir
MODELS = cc.models
MAX_TEXT_LENGTH = cc.max_text_length
SEGMENT_LENGTH = int(cc.segment_length)

# a sentence end followed by a whitespace, the preferred place to cut a long text
SENTENCE_END = re.compile(r"[.!?][\"'”’»)\]]*\s")
WHITESPACE = re.compile(r"\s")


logger = logging.getLogger("ray.serve")


def _get_gpu_id(device: str) -> int | None:
    if not device.startswith("cuda"):
        return None

    import torch

    if not torch.cuda.is_available():
        logger.warning(f"spaCy is configured for '{device}', but no GPU is visible!")
        return None

    return int(device.split(":")[1]) if ":" in device else 0


def _find_cut(text: str, start: int, end: int) -> int:
    """Returns the index in text[start:end] after the last sentence end, else after the last whitespace, else end."""
    for pattern in (SENTENCE_END, WHITESPACE):
        cut = None
        for match in pattern.finditer(text, start, end):
            cut = match.end()
        if cut is not None:
            return cut
    return end


def _segment(text: str, segment_length: int) -> list[tuple[int, str]]:
    """Cuts the text into consecutive segments of at most segment_length characters and returns them with their start index."""
    segments: list[tuple[int, str]] = []
    start = 0
    while len(text) - start > segment_length:
        cut = _find_cut(text, start + segment_length // 2, start + segment_length)
        segments.append((start, text[start:cut]))
        start = cut
    segments.append((start, text[start:]))
    return segments


@serve.deployment(**build_ray_model_deployment_config("spacy"))
class SpacyModel:
    def __init__(self):
        logger.debug("Loading spaCy Models...")
        init_glitchtip()
        self.gpu_id = _get_gpu_id(DEVICE)
        self._use_device()

        nlp: dict[str, Language] = dict()

        for lang, model in MODELS.items():
            if lang == "default":
                continue
            logger.info(f"Loading spaCy Model '{model}' ...")
            nlp[lang] = spacy.load(f"{MODEL_DIR}/{model}")

        logger.debug("Loading spaCy Models... Done!")

        nlp["default"] = nlp[MODELS.default]

        for lang in nlp.values():
            lang.max_length = MAX_TEXT_LENGTH

        self.spacy_models = nlp

    def _use_device(self) -> None:
        # thinc keeps its current ops in a ContextVar and Ray Serve runs every request
        # in a new asyncio task, so the GPU has to be required again for every request
        if self.gpu_id is None:
            return
        spacy.require_gpu(gpu_id=self.gpu_id)  # type: ignore

    def _get_language_specific_model(self, language: str) -> Language:
        return (
            self.spacy_models[language]
            if language in self.spacy_models
            else self.spacy_models["default"]
        )

    def pipeline(self, input: SpacyInput) -> SpacyPipelineOutput:
        self._use_device()
        model = self._get_language_specific_model(input.language)

        # long texts are processed in segments to bound the (GPU) memory
        segments = _segment(input.text, SEGMENT_LENGTH)
        output = SpacyPipelineOutput()
        token_offset = 0
        docs = model.pipe((text for _, text in segments), batch_size=1)
        for (char_offset, _), doc in zip(segments, docs):
            self._add_doc(output, doc, char_offset, token_offset)
            token_offset += len(doc)
        return output

    def _add_doc(
        self,
        output: SpacyPipelineOutput,
        doc: Doc,
        char_offset: int,
        token_offset: int,
    ) -> None:
        output.tokens.extend(
            SpacyToken(
                text=token.text,
                start_char=char_offset + token.idx,
                end_char=char_offset + token.idx + len(token.text),
                pos=token.pos_,
                lemma=token.lemma_,
                is_stopword=token.is_stop,
                is_punctuation=token.is_punct,
                is_alpha=token.is_alpha,
                is_digit=token.is_digit,
            )
            for token in doc
        )

        output.ents.extend(
            SpacySpan(
                text=ent.text,
                start_char=char_offset + ent.start_char,
                end_char=char_offset + ent.end_char,
                start_token=token_offset + ent.start,
                end_token=token_offset + ent.end,
                label=ent.label_,
            )
            for ent in doc.ents
        )

        output.sents.extend(
            SpacySpan(
                text=sent.text,
                start_char=char_offset + sent.start_char,
                end_char=char_offset + sent.end_char,
                start_token=token_offset + sent.start,
                end_token=token_offset + sent.end,
                label="SENTENCE",
            )
            for sent in doc.sents
        )
