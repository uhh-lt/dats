from core.code.code_crud import crud_code
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.metadata.project_metadata_crud import crud_project_meta
from core.project.project_dto import ProjectCreate, ProjectUpdate
from core.project.project_orm import ProjectORM
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_ID,
    crud_user,
)
from core.user.user_dto import UserRead
from core.user.user_orm import UserORM
from fastapi.encoders import jsonable_encoder
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from repos.db.crud_base import CRUDBase
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from sqlalchemy.orm import Session


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    def create(
        self, db: Session, *, create_dto: ProjectCreate, creating_user: UserRead
    ) -> ProjectORM:
        # 1) create the project
        dto_obj_data = jsonable_encoder(create_dto)
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        project_id = db_obj.id

        # 2) associate the system users
        self.associate_user(db=db, proj_id=project_id, user_id=SYSTEM_USER_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_ZEROSHOT_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_FEWSHOT_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_TRAINED_ID)

        # 3) associate the user that created the project
        if creating_user.id != SYSTEM_USER_ID:
            self.associate_user(db=db, proj_id=project_id, user_id=creating_user.id)

        # 4) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=project_id)

        # 5) create project metadata
        crud_project_meta.create_project_metadata_for_project(db=db, proj_id=project_id)

        # 6) create filesystem directory structure
        FilesystemRepo().create_directory_structure_for_project(proj_id=project_id)

        return db_obj

    def remove(self, db: Session, *, id: int) -> ProjectORM:
        # 1) delete the project and all connected data via cascading delete
        proj_db_obj = super().remove(db=db, id=id)
        # 2) delete the files from filesystem
        FilesystemRepo().purge_project_data(proj_id=id)
        # 3) Remove embeddings
        with WeaviateRepo().weaviate_session() as client:
            crud_document_embedding.remove_embeddings_by_project(
                client=client, project_id=id
            )
            crud_image_embedding.remove_embeddings_by_project(
                client=client, project_id=id
            )
            crud_sentence_embedding.remove_embeddings_by_project(
                client=client, project_id=id
            )
            crud_cluster_embedding.remove_embeddings_by_project(
                client=client, project_id=id
            )
            crud_aspect_embedding.remove_embeddings_by_project(
                client=client, project_id=id
            )

        return proj_db_obj

    def associate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)

        # add user to project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        return user_db_obj

    def dissociate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)

        # remove user from project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        return user_db_obj

    def exists_by_title(self, db: Session, title: str) -> bool:
        return (
            db.query(self.model).filter(self.model.title == title).first() is not None
        )


crud_project = CRUDProject(ProjectORM)
