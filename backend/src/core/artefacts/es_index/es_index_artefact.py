"""The artefact `es_index`, the full-text search index (search is core), with
the archive of its Elasticsearch entry."""

from collections.abc import Mapping

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from repos.elastic.elastic_repo import ElasticSearchRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact

_CONTENT = TypeAdapter(str | None)


class _ElasticIndexArchive(ArtefactArchive):
    """The Elasticsearch entry, computed again from the filename and the content."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        crud_sdoc_elastic.create(
            client=ElasticSearchRepo().get_client(),
            project_id=sdoc.project_id,
            create_dto=ElasticSearchDocumentCreate(
                project_id=sdoc.project_id,
                sdoc_id=sdoc.id,
                filename=sdoc.filename,
                content=_CONTENT.validate_python(archived.get("content")) or "",
            ),
        )


ES_INDEX = artefact(
    "es_index", title="Full-text index", always=True, archive=_ElasticIndexArchive()
)
