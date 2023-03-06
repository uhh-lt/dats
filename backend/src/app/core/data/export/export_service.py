from pathlib import Path
from typing import Dict, List, Optional, Tuple
import zipfile

from loguru import logger
import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import crud_user
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
    BBoxAnnotationReadResolvedCode,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
)
from app.core.data.dto.span_group import SpanGroupRead
from app.core.data.dto.user import UserRead
from app.core.data.export.export_format import ExportFormat
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.repo.repo_service import RepoService
from app.util.singleton_meta import SingletonMeta


class ExportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()

        return super(ExportService, cls).__new__(cls)

    def _write_export_data_to_temp_file(
        self, data: pd.DataFrame, export_format: ExportFormat, fn: Optional[str] = None
    ) -> Path:
        temp_file = self.repo.create_temp_file(fn=fn)
        temp_file = temp_file.replace(
            temp_file.with_suffix(f".{str(export_format.value).lower()}")
        )

        logger.info(f"Writing export data to {temp_file} !")
        if export_format == ExportFormat.CSV:
            data.to_csv(temp_file, sep=",", index=False, header=True)
        elif export_format == ExportFormat.JSON:
            data.to_json(temp_file, orient="records")

        return temp_file

    def _export_adoc_data(self, db: Session, adoc_id: int) -> pd.DataFrame:
        logger.info(f"Exporting AnnotationDocument {adoc_id} ...")
        # get the adoc, proj, sdoc, user, and all annos
        adoc = crud_adoc.read(db=db, id=adoc_id)
        user_dto = UserRead.from_orm(adoc.user)
        sdoc_dto = SourceDocumentRead.from_orm(adoc.source_document)
        proj_dto = ProjectRead.from_orm(
            crud_project.read(db=db, id=sdoc_dto.project_id)
        )

        # span annos
        spans = adoc.span_annotations
        span_read_dtos = [SpanAnnotationRead.from_orm(span) for span in spans]
        span_read_resolved_dtos = [
            SpanAnnotationReadResolved(
                **span_dto.dict(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.from_orm(span_orm.current_code.code),
                span_text=span_orm.span_text.text,
            )
            for span_orm, span_dto in zip(spans, span_read_dtos)
        ]

        # bbox annos
        bboxes = adoc.bbox_annotations
        bbox_read_dtos = [BBoxAnnotationRead.from_orm(bbox) for bbox in bboxes]
        bbox_read_resolved_dtos = [
            BBoxAnnotationReadResolvedCode(
                **bbox_dto.dict(exclude={"current_code_id"}),
                code=CodeRead.from_orm(bbox_orm.current_code.code),
            )
            for bbox_orm, bbox_dto in zip(bboxes, bbox_read_dtos)
        ]

        # fill the DataFrame
        data = {
            "adoc_id": [],
            "proj_name": [],
            "proj_id": [],
            "sdoc_name": [],
            "sdoc_id": [],
            "user_first_name": [],
            "user_last_name": [],
            "user_id": [],
            "code_name": [],
            "code_id": [],
            "created": [],
            "text": [],
            "text_begin_char": [],
            "text_end_char": [],
            "bbox_x_min": [],
            "bbox_x_max": [],
            "bbox_y_min": [],
            "bbox_y_max": [],
        }

        for span in span_read_resolved_dtos:
            data["proj_name"].append(proj_dto.title)
            data["proj_id"].append(proj_dto.id)
            data["sdoc_name"].append(sdoc_dto.filename)
            data["sdoc_id"].append(sdoc_dto.id)
            data["adoc_id"].append(adoc_id)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)
            data["user_id"].append(user_dto.id)
            data["code_name"].append(span.code.name)
            data["code_id"].append(span.code.id)
            data["created"].append(span.created)
            data["text"].append(span.span_text)
            data["text_begin_char"].append(span.begin)
            data["text_end_char"].append(span.end)

            data["bbox_x_min"].append(None)
            data["bbox_x_max"].append(None)
            data["bbox_y_min"].append(None)
            data["bbox_y_max"].append(None)

        for bbox in bbox_read_resolved_dtos:
            data["proj_name"].append(proj_dto.title)
            data["proj_id"].append(proj_dto.id)
            data["sdoc_name"].append(sdoc_dto.filename)
            data["sdoc_id"].append(sdoc_dto.id)
            data["adoc_id"].append(adoc_id)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)
            data["user_id"].append(user_dto.id)
            data["code_name"].append(bbox.code.name)
            data["code_id"].append(bbox.code.id)
            data["created"].append(bbox.created)
            data["bbox_x_min"].append(bbox.x_min)
            data["bbox_x_max"].append(bbox.x_max)
            data["bbox_y_min"].append(bbox.y_min)
            data["bbox_y_max"].append(bbox.y_max)

            data["text"].append(None)
            data["text_begin_char"].append(None)
            data["text_end_char"].append(None)

        df = pd.DataFrame(data=data)
        return df

    def export_adoc(
        self, db: Session, adoc_id: int, export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        export_data = self._export_adoc_data(db=db, adoc_id=adoc_id)
        export_file = self._write_export_data_to_temp_file(
            data=export_data, export_format=export_format, fn=f"adoc_{adoc_id}_export"
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def export_adocs(
        self, db: Session, adoc_ids: List[int], export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        exported_files = []
        for adoc_id in adoc_ids:
            df = self._export_adoc_data(db=db, adoc_id=adoc_id)
            export_file = self._write_export_data_to_temp_file(
                data=df, export_format=export_format, fn=f"adoc_{adoc_id}_export"
            )
            exported_files.append(export_file)

        # ZIP all files
        export_zip = self.repo.create_temp_file("adocs_export.zip")
        with zipfile.ZipFile(export_zip, mode="w") as zipf:
            for file in exported_files:
                zipf.write(file, file.name)

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_memo_data(self, db: Session, memo_id: int) -> pd.DataFrame:
        logger.info(f"Exporting Memo {memo_id} ...")
        memo = crud_memo.read(db=db, id=memo_id)
        memo_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)

        user_dto = UserRead.from_orm(memo.user)
        proj_dto = ProjectRead.from_orm(memo.project)

        # get attached object
        # avoid circular imports
        from app.core.data.crud.object_handle import crud_object_handle

        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=memo.attached_to
        )

        # common data
        data = {
            "memo_id": [memo_id],
            "proj_name": [proj_dto.title],
            "proj_id": [proj_dto.id],
            "user_first_name": [user_dto.first_name],
            "user_last_name": [user_dto.last_name],
            "user_id": [user_dto.id],
            "created": [memo_dto.created],
            "updated": [memo_dto.updated],
            "attached_to": [memo_dto.attached_object_type],
            "content": [memo_dto.content],
            "adoc_id": [None],
            "sdoc_name": [None],
            "sdoc_id": [None],
            "tag_name": [None],
            "tag_id": [None],
            "span_group_name": [None],
            "span_group_id": [None],
            "code_name": [None],
            "code_id": [None],
            "span_anno_id": [None],
            "span_anno_text": [None],
            "bbox_anno_id": [None],
        }

        if isinstance(attached_to, CodeORM):
            dto = CodeRead.from_orm(attached_to)
            data["code_name"] = [dto.name]
            data["code_id"] = [dto.id]

        elif isinstance(attached_to, SpanGroupORM):
            dto = SpanGroupRead.from_orm(attached_to)
            data["span_group_name"] = [dto.name]
            data["span_group_id"] = [dto.id]

        elif isinstance(attached_to, AnnotationDocumentORM):
            dto = AnnotationDocumentRead.from_orm(attached_to)
            sdoc_dto = SourceDocumentRead.from_orm(attached_to.source_document)
            data["sdoc_name"] = [sdoc_dto.filename]
            data["adoc_id"] = [dto.id]

        elif isinstance(attached_to, SourceDocumentORM):
            dto = SourceDocumentRead.from_orm(attached_to)
            data["sdoc_name"] = [dto.filename]
            data["sdoc_id"] = [dto.id]

        elif isinstance(attached_to, DocumentTagORM):
            dto = DocumentTagRead.from_orm(attached_to)
            data["tag_name"] = [dto.title]
            data["tag_id"] = [dto.id]

        elif isinstance(attached_to, SpanAnnotationORM):
            span_read_dto = SpanAnnotationRead.from_orm(attached_to)
            span_read_resolved_dto = SpanAnnotationReadResolved(
                **span_read_dto.dict(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.from_orm(attached_to.current_code.code),
                span_text=attached_to.span_text.text,
            )

            data["span_anno_id"] = [span_read_dto.id]
            data["span_anno_text"] = [span_read_resolved_dto.span_text]
            data["code_id"] = [span_read_resolved_dto.code.id]
            data["code_name"] = [span_read_resolved_dto.code.name]

        elif isinstance(attached_to, BBoxAnnotationORM):
            bbox_read_dto = BBoxAnnotationRead.from_orm(attached_to)
            bbox_read_resolved_dto = BBoxAnnotationReadResolvedCode(
                **bbox_read_dto.dict(exclude={"current_code_id"}),
                code=CodeRead.from_orm(attached_to.current_code.code),
            )

            data["bbox_anno_id"] = [bbox_read_dto.id]
            data["code_id"] = [bbox_read_resolved_dto.code.id]
            data["code_name"] = [bbox_read_resolved_dto.code.name]

        elif isinstance(attached_to, ProjectORM):
            logger.warning("LogBook Export still todo!")
            pass

        df = pd.DataFrame(data=data)
        return df

    def export_memo(
        self, db: Session, memo_id: int, export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        export_data = self._export_memo_data(db=db, memo_id=memo_id)
        export_file = self._write_export_data_to_temp_file(
            data=export_data, export_format=export_format, fn=f"memo_{memo_id}_export"
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_user_data_from_proj(
        self,
        db: Session,
        user_id: int,
        proj_id: int,
    ) -> Tuple[List[pd.DataFrame], List[pd.DataFrame]]:
        logger.info(f"Exporting data of User {user_id} in Project {proj_id} ...")
        user = crud_user.read(db=db, id=user_id)

        # all AnnotationDocuments
        adocs = [
            AnnotationDocumentRead.from_orm(adoc)
            for adoc in user.annotation_documents
            if adoc.source_document.project_id == proj_id
        ]

        exported_adocs: List[pd.DataFrame] = []
        for adoc in adocs:
            export_data = self._export_adoc_data(db=db, adoc_id=adoc.id)
            exported_adocs.append(export_data)

        # all Memos
        memos = user.memos

        exported_memos: List[pd.DataFrame] = []
        for memo in memos:
            export_data = self._export_memo_data(db=db, memo_id=memo.id)
            exported_memos.append(export_data)

        return exported_adocs, exported_memos

    def export_user_data_from_proj(
        self,
        db: Session,
        user_id: int,
        proj_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        exported_adocs, exported_memos = self._export_user_data_from_proj(
            db=db, user_id=user_id, proj_id=proj_id
        )

        exported_files = []
        for adoc_df in exported_adocs:
            export_file = self._write_export_data_to_temp_file(
                data=adoc_df,
                export_format=export_format,
                fn=f"adoc_{adoc_df.iloc[0].adoc_id}_export",
            )
            exported_files.append(export_file)

        exported_memo_df = pd.concat(exported_memos)
        export_file = self._write_export_data_to_temp_file(
            data=exported_memo_df,
            export_format=export_format,
            fn=f"user_{user_id}_memo_export",
        )
        exported_files.append(export_file)

        # ZIP all files
        export_zip = self.repo.create_temp_file(
            f"user_{user_id}_project_{proj_id}_export.zip"
        )
        with zipfile.ZipFile(export_zip, mode="w") as zipf:
            for file in exported_files:
                zipf.write(file, file.name)

        return self.repo.get_temp_file_url(export_zip.name, relative=True)
