from uuid import uuid4

from sqlalchemy.orm import Session
from src.modules.perspectives.cluster_embedding_crud import crud_cluster_embedding

from common.singleton_meta import SingletonMeta
from core.code.code_crud import crud_code
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.sdoc_elastic_crud import crud_elastic_sdoc
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreateIntern,
)
from core.memo.memo_elastic_crud import crud_elastic_memo
from core.metadata.project_metadata_crud import crud_project_meta
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_ID,
)
from core.user.user_orm import UserORM
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_service import JobService


class ProjectService(metaclass=SingletonMeta):
    """Service to handle project creation and initialization."""

    def __new__(cls, *args, **kwargs):
        cls.fsr = FilesystemRepo()
        cls.es_repo = ElasticSearchRepo()
        cls.weaviate = WeaviateRepo()
        cls.js = JobService()
        return super(ProjectService, cls).__new__(cls)

    def associate_user(self, *, db: Session, proj_id: int, user_id: int) -> UserORM:
        # 1) add user to project
        user_db_obj = crud_project.associate_user(
            db=db, proj_id=proj_id, user_id=user_id
        )

        # 2) create memo for this user–project association
        crud_memo.create_for_attached_object(
            db=db,
            attached_object_id=proj_id,
            attached_object_type=AttachedObjectType.project,
            create_dto=MemoCreateIntern(
                uuid=str(uuid4()),
                title="Project Memo",
                content="",
                content_json="",
                starred=False,
                user_id=user_id,
                project_id=proj_id,
            ),
        )

        return user_db_obj

    def create_project(
        self, db: Session, create_dto: ProjectCreate, creating_user_id: int
    ) -> ProjectORM:
        # 1) create the project
        proj = crud_project.create(db=db, create_dto=create_dto)
        project_id = proj.id

        # 2) associate the system users
        self.associate_user(db=db, proj_id=project_id, user_id=SYSTEM_USER_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_ZEROSHOT_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_FEWSHOT_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_TRAINED_ID)

        # 3) associate the user that created the project
        if creating_user_id not in [
            SYSTEM_USER_ID,
            ASSISTANT_ZEROSHOT_ID,
            ASSISTANT_FEWSHOT_ID,
            ASSISTANT_TRAINED_ID,
        ]:
            self.associate_user(db=db, proj_id=project_id, user_id=creating_user_id)

        # 4) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=project_id)

        # 5) create project metadata
        crud_project_meta.create_project_metadata_for_project(db=db, proj_id=project_id)

        # 6) create filesystem directory structure
        self.fsr.create_directory_structure_for_project(proj_id=project_id)

        # 7) create elasticsearch indices for this project
        client = self.es_repo.client
        crud_elastic_sdoc.index.create_index(client=client, proj_id=project_id)
        crud_elastic_memo.index.create_index(client=client, proj_id=project_id)

        # 8) create weaviate tenants for this project
        from core.doc.document_collection import DocumentCollection
        from core.doc.image_collection import ImageCollection
        from core.doc.sentence_collection import SentenceCollection
        from modules.perspectives.aspect_collection import AspectCollection
        from modules.perspectives.cluster_collection import ClusterCollection

        with self.weaviate.weaviate_session() as client:
            DocumentCollection.create_tenant(client, project_id)
            SentenceCollection.create_tenant(client, project_id)
            ImageCollection.create_tenant(client, project_id)
            AspectCollection.create_tenant(client, project_id)
            ClusterCollection.create_tenant(client, project_id)

        # 8) re-load fresh instance to avoid detachment
        fresh = db.get(ProjectORM, project_id)
        if fresh is None:
            raise ValueError("Failed to reload freshly created project from DB")
        return fresh

    def delete_project(self, db: Session, *, proj_id: int) -> ProjectORM:
        # 1) delete the project and all connected data via cascading delete
        proj_db_obj = crud_project.delete(db=db, id=proj_id)

        # 2) delete the files from filesystem
        self.fsr.purge_project_data(proj_id=proj_id)

        # 3) delete elasticsearch indices for this project
        client = self.es_repo.client
        crud_elastic_sdoc.index.delete_index(client=client, proj_id=proj_id)
        crud_elastic_memo.index.delete_index(client=client, proj_id=proj_id)

        # 4) delete weaviate embeddings and related search indices for this project
        with self.weaviate.weaviate_session() as client:
            # remove all vector embeddings stored in Weaviate
            crud_document_embedding.remove_embeddings_by_project(
                client=client, project_id=proj_id
            )
            crud_image_embedding.remove_embeddings_by_project(
                client=client, project_id=proj_id
            )
            crud_sentence_embedding.remove_embeddings_by_project(
                client=client, project_id=proj_id
            )
            crud_aspect_embedding.remove_embeddings_by_project(
                client=client, project_id=proj_id
            )
            crud_cluster_embedding.remove_embeddings_by_project(
                client=client, project_id=proj_id
            )

        # 5) delete redis entries for this project
        self.js.remove_jobs_by_project(project_id=proj_id)

        return proj_db_obj
