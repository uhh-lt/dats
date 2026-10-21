from enum import Enum


class ImportJobType(str, Enum):
    PROJECT = "PROJECT"
    CODES = "CODES"
    TAGS = "TAGS"
    FOLDERS = "FOLDERS"
    BBOX_ANNOTATIONS = "BBOX_ANNOTATIONS"
    SPAN_ANNOTATIONS = "SPAN_ANNOTATIONS"
    SENTENCE_ANNOTATIONS = "SENTENCE_ANNOTATIONS"
    USERS = "USERS"
    PROJECT_METADATA = "PROJECT_METADATA"
    WHITEBOARDS = "WHITEBOARDS"
    TIMELINE_ANALYSES = "TIMELINE_ANALYSES"
    COTA = "COTA"
    MEMOS = "MEMOS"
    DOCUMENTS = "DOCUMENTS"


class ExportEntity(str, Enum):
    BBOX_ANNOTATION = "bbox_annotation"
    CODE = "code"
    COTA = "cota"
    FOLDER = "folder"
    MEMO = "memo"
    PROJECT_METADATA = "project_metadata"
    SDOC = "sdoc"
    SENT_ANNOTATION = "sent_annotation"
    SPAN_ANNOTATION = "span_annotation"
    TAG = "tag"
    TIMELINE_ANALYSIS = "timeline_analysis"
    USER = "user"
    WHITEBOARD = "whiteboard"

    def get_regex(self) -> str:
        match self:
            case ExportEntity.BBOX_ANNOTATION:
                return r"project_\d+_all_bbox_annotations.csv"
            case ExportEntity.CODE:
                return r"project_\d+_all_codes.csv"
            case ExportEntity.COTA:
                return r"project_\d+_all_cota.csv"
            case ExportEntity.FOLDER:
                return r"project_\d+_all_folders.csv"
            case ExportEntity.MEMO:
                return r"project_\d+_all_memos.csv"
            case ExportEntity.PROJECT_METADATA:
                return r"project_\d+_all_project_metadatas.csv"
            case ExportEntity.SDOC:
                return r"project_\d+_all_docs.zip"
            case ExportEntity.SENT_ANNOTATION:
                return r"project_\d+_all_sentence_annotations.csv"
            case ExportEntity.SPAN_ANNOTATION:
                return r"project_\d+_all_span_annotations.csv"
            case ExportEntity.TAG:
                return r"project_\d+_all_tags.csv"
            case ExportEntity.TIMELINE_ANALYSIS:
                return r"project_\d+_all_timeline_analyses.csv"
            case ExportEntity.USER:
                return r"project_\d+_all_users.csv"
            case ExportEntity.WHITEBOARD:
                return r"project_\d+_all_whiteboards.csv"
