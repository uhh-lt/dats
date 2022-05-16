from enum import Enum
from typing import Optional

from frozendict import frozendict


class DocType(str, Enum):
    text = 'text'
    image = 'image'
    video = 'video'
    audio = 'audio'


__doc_type_to_mime_type_map = frozendict({
    DocType.text: ["text/plain"],
    DocType.image: ["image/jpeg", "image/png"],
    DocType.video: [],
    DocType.audio: []
})

__mime_type_to_doc_type_map = frozendict({
    mime_type: doc_type
    for doc_type, mime_types in __doc_type_to_mime_type_map.items()
    for mime_type in __doc_type_to_mime_type_map[doc_type]
})

__archive_mime_types__ = frozenset({
    "application/zip"
})


def get_doc_type(mime_type: str) -> Optional[DocType]:
    if mime_type in __mime_type_to_doc_type_map:
        return __mime_type_to_doc_type_map[mime_type]
    return None


def mime_type_supported(mime_type: str) -> bool:
    return mime_type in __mime_type_to_doc_type_map or is_archive_file(mime_type)


def is_archive_file(mime_type: str) -> bool:
    return mime_type in __archive_mime_types__
