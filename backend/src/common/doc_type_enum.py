from enum import Enum


class DocType(str, Enum):
    text = "text"
    image = "image"
    video = "video"
    audio = "audio"
