"""The artefact `thumbnail`, with the archive of its files."""

from collections.abc import Mapping

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.artefacts.thumbnail.image_thumbnail_utils import generate_thumbnails
from core.artefacts.video_utils import store_video_thumbnail
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact


class _ThumbnailArchive(ArtefactArchive):
    """The thumbnail files, written again from the uploaded file with the code of
    the thumbnail steps: the WebP and thumbnail of an image, the thumbnail of a
    video (linked as `repo_url`). The audio thumbnail step writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        sdoc_read = SourceDocumentRead.model_validate(sdoc)
        path = FilesystemRepo().get_path_to_sdoc_file(sdoc_read)
        match sdoc_read.doctype:
            case DocType.image:
                generate_thumbnails(path)
            case DocType.video:
                store_video_thumbnail(db=db, sdoc=sdoc_read, video_path=path)


THUMBNAIL = artefact(
    "thumbnail", title="Thumbnail", always=True, archive=_ThumbnailArchive()
)
