from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataBaseDTO,
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataUpdate,
)
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase
from repos.db.sql_exceptions import NoSuchElementError


# TODO: wohin damit?
def is_correct_type(
    metatye: MetaType, sdoc_metadata: SourceDocumentMetadataBaseDTO
) -> bool:
    match metatye:
        case MetaType.STRING:
            return sdoc_metadata.str_value is not None
        case MetaType.NUMBER:
            return sdoc_metadata.int_value is not None
        case MetaType.DATE:
            return sdoc_metadata.date_value is not None
        case MetaType.BOOLEAN:
            return sdoc_metadata.boolean_value is not None
        case MetaType.LIST:
            return sdoc_metadata.list_value is not None


class CRUDSourceDocumentMetadata(
    SQLCRUDBase[
        SourceDocumentMetadataORM,
        SourceDocumentMetadataCreate,
        SourceDocumentMetadataUpdate,
    ]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[SourceDocumentMetadataCreate]
    ) -> list[SourceDocumentMetadataORM]:
        from core.metadata.project_metadata_crud import crud_project_meta

        # check that every ProjectMetadata exists and every value has its type
        project_metadatas = {
            pm.id: ProjectMetadataRead.model_validate(pm)
            for pm in crud_project_meta.read_by_ids(
                db=db,
                ids=list(
                    {create_dto.project_metadata_id for create_dto in create_dtos}
                ),
            )
        }
        for create_dto in create_dtos:
            metatype = project_metadatas[create_dto.project_metadata_id].metatype
            if not is_correct_type(metatype, create_dto):
                raise ValueError(f"provided value has the wrong type (need {metatype})")

        return super().create_multi(db=db, create_dtos=create_dtos)

    def create_initial_metadata(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        doctype: DocType,
    ) -> list[SourceDocumentMetadataORM]:
        from core.metadata.project_metadata_crud import crud_project_meta

        # read all project metadata
        project_metadatas = {
            pm.key: pm
            for pm in crud_project_meta.read_by_project_and_doctype(
                db=db, project_id=project_id, doctype=doctype
            )
        }

        create_dtos: list[SourceDocumentMetadataCreate] = []
        for pm in project_metadatas.values():
            create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    metatype=pm.metatype,
                    project_metadata_id=pm.id,
                    source_document_id=sdoc_id,
                )
            )

        return self.create_multi(
            db=db,
            create_dtos=create_dtos,
        )

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentMetadataORM]:
        query = (
            db.query(self.model)
            .join(SourceDocumentMetadataORM.project_metadata)
            .filter(ProjectMetadataORM.project_id == project_id)
        )
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        db_objs = query.all()
        return db_objs

    def read_by_sdoc_and_key(
        self,
        db: Session,
        *,
        key: str,
        sdoc_id: int,
    ) -> SourceDocumentMetadataORM:
        query = (
            db.query(self.model)
            .join(SourceDocumentMetadataORM.project_metadata)
            .filter(
                ProjectMetadataORM.key == key,
                SourceDocumentMetadataORM.source_document_id == sdoc_id,
            )
        )
        db_obj = query.first()
        if db_obj is None:
            raise NoSuchElementError(self.model, sdoc_id=sdoc_id, key=key)
        return db_obj

    def read_by_sdoc_and_keys(
        self,
        db: Session,
        *,
        keys: list[str],
        sdoc_id: int,
    ) -> list[tuple[ProjectMetadataORM, SourceDocumentMetadataORM]]:
        if not keys:
            return []

        results: list[tuple[ProjectMetadataORM, SourceDocumentMetadataORM]] = []
        for i in range(0, len(keys), BATCH_SIZE):
            batch_keys = keys[i : i + BATCH_SIZE]
            query = (
                db.query(ProjectMetadataORM, SourceDocumentMetadataORM)
                .join(SourceDocumentMetadataORM.project_metadata)
                .filter(
                    ProjectMetadataORM.key.in_(batch_keys),
                    SourceDocumentMetadataORM.source_document_id == sdoc_id,
                )
            )
            results.extend((r[0], r[1]) for r in query.all())
        return results

    def read_by_sdoc(
        self, db: Session, *, sdoc_id: int
    ) -> list[SourceDocumentMetadataORM]:
        db_objs = (
            db.query(self.model)
            .filter(SourceDocumentMetadataORM.source_document_id == sdoc_id)
            .all()
        )
        return db_objs

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[int],
        update_dtos: list[SourceDocumentMetadataUpdate],
    ) -> list[SourceDocumentMetadataORM]:
        # every value must have the type of its project metadata
        for db_obj, update_dto in zip(self.read_by_ids(db=db, ids=ids), update_dtos):
            metatype = ProjectMetadataRead.model_validate(
                db_obj.project_metadata
            ).metatype
            if not is_correct_type(metatype, update_dto):
                raise ValueError(f"provided value has the wrong type (need {metatype})")
        return super().update_multi(db=db, ids=ids, update_dtos=update_dtos)

    def update_multi_with_doctype(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        doctype: DocType,
        keys: list[str],
        values: list,
    ) -> list[SourceDocumentMetadataORM]:
        assert len(keys) == len(values), "keys and values must have the same length"

        # read all sdoc metadata
        metadatas = {
            pm.key: (pm, sm)
            for (pm, sm) in self.read_by_sdoc_and_keys(
                db=db, sdoc_id=sdoc_id, keys=keys
            )
        }

        update_dtos: list[SourceDocumentMetadataUpdate] = []
        sdoc_metadata_ids: list[int] = []
        for key, value in zip(keys, values):
            # ensure key exists
            project_metadata, sdoc_metadata = metadatas.get(key, (None, None))
            if sdoc_metadata is None or project_metadata is None:
                raise ValueError(f"Unknown metadata key: {key}")

            # ensure value conforms with metatype
            metatype = MetaType(project_metadata.metatype)
            if not metatype.is_value_of_type(value):
                raise ValueError(
                    f"Value for key '{key}' does not conform to metatype {metatype}"
                )

            update_dtos.append(
                SourceDocumentMetadataUpdate.with_metatype(
                    metatype=metatype,
                    value=value,
                )
            )
            sdoc_metadata_ids.append(sdoc_metadata.id)

        return self.update_multi(
            db=db,
            ids=sdoc_metadata_ids,
            update_dtos=update_dtos,
        )

    ### DELETE OPERATIONS ###

    def delete_by_project_metadata(
        self, db: Session, *, project_metadata_id: int
    ) -> None:
        db.query(self.model).filter(
            SourceDocumentMetadataORM.project_metadata_id == project_metadata_id
        ).delete()


crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
