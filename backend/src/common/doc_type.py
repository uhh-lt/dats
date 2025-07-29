from enum import Enum
from pathlib import Path

import magic
from frozendict import frozendict


class DocType(str, Enum):
    text = "text"
    image = "image"
    video = "video"
    audio = "audio"


__doc_type_to_mime_type_map = frozendict(
    {
        DocType.text: [
            "text/plain",
            "text/html",
            "application/pdf",
            "application/msword",  # .doc
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # docx
            "application/zip",  # TODO: THIS IS A TEMPORARY FIX docx
        ],
        DocType.image: ["image/jpeg", "image/png"],
        DocType.audio: [
            "audio/mpeg",
            "audio/ogg",
            "audio/wave",
            "audio/webm",
            "audio/x-wav",
            "audio/x-pn-wav",
            "audio/wav",
            "audio/x-hx-aac-adts",
        ],
        DocType.video: [
            "video/mp4",
            "video/webm",
            "video/x-m4v",
            "video/x-msvideo",
            "video/quicktime",
        ],
    }
)

__mime_type_to_doc_type_map = frozendict(
    {
        mime_type: doc_type
        for doc_type, mime_types in __doc_type_to_mime_type_map.items()
        for mime_type in __doc_type_to_mime_type_map[doc_type]
    }
)

__archive_mime_types__ = frozenset({"application/zip"})


def get_doc_type(mime_type: str) -> DocType | None:
    if mime_type in __mime_type_to_doc_type_map:
        return __mime_type_to_doc_type_map[mime_type]
    return None


def get_mime_type_from_file(file: Path) -> str:
    file_bytes = file.read_bytes()
    return magic.from_buffer(file_bytes, mime=True)


def mime_type_supported(mime_type: str) -> bool:
    return mime_type in __mime_type_to_doc_type_map or is_archive_file(mime_type)


def is_archive_file(mime_type: str) -> bool:
    return mime_type in __archive_mime_types__
