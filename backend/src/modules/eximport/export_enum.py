from enum import Enum


class ExportJobType(str, Enum):
    ALL_DATA = "ALL_DATA"
    # all
    ALL_USERS = "ALL_USERS"
    ALL_SDOCS = "ALL_SDOCS"
    ALL_CODES = "ALL_CODES"
    ALL_TAGS = "ALL_TAGS"
    ALL_FOLDERS = "ALL_FOLDERS"
    ALL_SPAN_ANNOTATIONS = "ALL_SPAN_ANNOTATIONS"
    ALL_SENTENCE_ANNOTATIONS = "ALL_SENTENCE_ANNOTATIONS"
    ALL_BBOX_ANNOTATIONS = "ALL_BBOX_ANNOTATIONS"
    ALL_MEMOS = "ALL_MEMOS"
    ALL_PROJECT_METADATA = "ALL_PROJECT_METADATA"
    ALL_WHITEBOARDS = "ALL_WHITEBOARDS"
    ALL_TIMELINE_ANALYSES = "ALL_TIMELINE_ANALYSES"
    ALL_COTA = "ALL_COTA"
    ALL_PROMPTS = "ALL_PROMPTS"
    ALL_EXPERIMENTS = "ALL_EXPERIMENTS"
    # selected
    SELECTED_SDOCS = "SELECTED_SDOCS"
    SELECTED_SPAN_ANNOTATIONS = "SELECTED_SPAN_ANNOTATIONS"
    SELECTED_SENTENCE_ANNOTATIONS = "SELECTED_SENTENCE_ANNOTATIONS"
    SELECTED_BBOX_ANNOTATIONS = "SELECTED_BBOX_ANNOTATIONS"
    SELECTED_MEMOS = "SELECTED_MEMOS"
    SELECTED_WHITEBOARDS = "SELECTED_WHITEBOARDS"
    SELECTED_TIMELINE_ANALYSES = "SELECTED_TIMELINE_ANALYSES"
    SELECTED_COTA = "SELECTED_COTA"


class ArchivePart(str, Enum):
    """A part of a project archive that carries an artefact of a source document
    which has no archive module (`sdocs/artefact_archive.py`)."""

    # the columns of the document's row in the documents file
    DATA_ROW = "data_row"
    # the document's metadata values
    METADATA = "metadata"
    # the annotations files (span, sentence and bbox annotations of every user)
    ANNOTATIONS = "annotations"
