"""The artefact `thumbnail`, with the archive of its files."""

from collections.abc import Mapping

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.artefacts.thumbnail.image_thumbnail_utils import generate_thumbnails
from core.artefacts.video_utils import store_video_thumbnail
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc.source_document_orm import SourceDocumentORM
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact


class _ThumbnailArchive(ArtefactArchive):
    """The thumbnail files, written again from the uploaded file with the code of
    the thumbnail steps: the WebP and thumbnail of an image, the thumbnail of a
    video. The audio thumbnail step writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        path = crud_sdoc_file.path(
            project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
        )
        match DocType(sdoc.doctype):
            case DocType.image:
                generate_thumbnails(
                    project_id=sdoc.project_id, sdoc_id=sdoc.id, image_path=path
                )
            case DocType.video:
                store_video_thumbnail(
                    project_id=sdoc.project_id, sdoc_id=sdoc.id, video_path=path
                )


THUMBNAIL = artefact(
    "thumbnail", title="Thumbnail", always=True, archive=_ThumbnailArchive()
)
