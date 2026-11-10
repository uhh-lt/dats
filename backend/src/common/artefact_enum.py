from enum import Enum


class Artefact(str, Enum):
    """A named piece of preprocessed document data. Pipeline steps declare the
    artefacts they require and produce (see `register_job`); the step order and
    the steps per doctype are derived from these declarations."""

    # core
    RAW_HTML = "raw_html"
    CONTENT = "content"
    LANGUAGE = "language"
    TOKENS_SENTENCES = "tokens_sentences"
    HTML = "html"
    THUMBNAIL = "thumbnail"
    FILE_METADATA = "file_metadata"
    # the audio stream: the uploaded file of an audio document, extracted from a video
    AUDIO = "audio"
    TRANSCRIPT = "transcript"

    # optional
    ES_INDEX = "es_index"
    SENTENCE_EMBEDDINGS = "sentence_embeddings"
    IMAGE_EMBEDDINGS = "image_embeddings"
    DOCUMENT_EMBEDDINGS = "document_embeddings"
    KEYWORDS = "keywords"
    WORD_FREQUENCIES = "word_frequencies"
    NER_SPANS = "ner_spans"
    IMAGE_CAPTION = "image_caption"
    OBJECT_BBOXES = "object_bboxes"
