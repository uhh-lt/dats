from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def persist_tags(
    db: Session, sdoc_db_obj: SourceDocumentORM, ppd: PreProDocBase
) -> None:
    logger.info(f"Persisting SourceDocument Tags for {ppd.filename}...")
    tags = ppd.tags
    if len(tags) > 0:
        crud_document_tag.link_multiple_document_tags(
            db=db,
            sdoc_ids=[sdoc_db_obj.id],
            tag_ids=tags,
        )
