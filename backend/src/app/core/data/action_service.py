from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.action import crud_action
from app.core.data.dto.action import ActionTargetObjectType, ActionType, ActionRead, ActionInDB, ActionCreate
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class ActionService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        # import locally to avoid circular imports
        from app.core.data.crud.object_handle import crud_object_handle
        cls.sqls = SQLService()
        cls.crud_action = crud_action
        cls.crud_object_handle = crud_object_handle

        return super(ActionService, cls).__new__(cls)

    def create_action(self,
                      proj_id: int,
                      user_id: int,
                      target_id: int,
                      target: ActionTargetObjectType,
                      action_type: ActionType) -> ActionRead:
        with self.sqls.db_session() as db:
            # create an ObjectHandle for the target
            oh_db_obj = self.crud_object_handle.create(db=db,
                                                       create_dto=ObjectHandleCreate(**{f"{target}_id": target_id}))

            create_dto = ActionCreate(project_id=proj_id, user_id=user_id, action_type=action_type)
            action_db_obj = self.crud_action._create_action(create_dto, db, oh_db_obj)

        return self._get_action_read_dto(action_id=action_db_obj.id)

    def _get_action_read_dto(self, action_id: int) -> ActionRead:
        with self.sqls.db_session() as db:
            db_obj = self.crud_action.read(db=db, id=action_id)
            action_target = self.crud_object_handle.resolve_handled_object(db=db, handle=db_obj.target)
            action_as_in_db_dto = ActionInDB.from_orm(db_obj)
        if isinstance(action_target, MemoORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.memo)
        elif isinstance(action_target, CodeORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.code)
        elif isinstance(action_target, SpanAnnotationORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.span_annotation)
        elif isinstance(action_target, SpanGroupORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.span_group)
        elif isinstance(action_target, BBoxAnnotationORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.bbox_annotation)
        elif isinstance(action_target, AnnotationDocumentORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.annotation_document)
        elif isinstance(action_target, SourceDocumentORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.source_document)
        elif isinstance(action_target, ProjectORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.project)
        elif isinstance(action_target, DocumentTagORM):
            return ActionRead(**action_as_in_db_dto.dict(exclude={"target_id"}),
                              target_id=action_target.id,
                              target_object_type=ActionTargetObjectType.document_tag)
        else:
            raise NotImplementedError(f"Action Target of type {type(action_target)} not supported!")

    def get_user_actions_of_project(self,
                                    db: Session,
                                    proj_id: int,
                                    user_id: int,
                                    action_type: Optional[ActionType] = None) -> List[ActionRead]:
        if action_type is None:
            db_objs = self.crud_action.read_by_user_and_project(db=db, user_id=user_id, proj_id=proj_id)
        else:
            db_objs = self.crud_action.read_by_user_and_project_and_action_type(db=db,
                                                                                user_id=user_id,
                                                                                proj_id=proj_id,
                                                                                action_type=action_type)
        return [self._get_action_read_dto(action_id=db_obj.id) for db_obj in db_objs]
