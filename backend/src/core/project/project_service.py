from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.code.code_crud import crud_code
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.metadata.project_metadata_crud import crud_project_meta
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate, ProjectRead
from core.prompt.prompt_service import PromptService
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_ID,
    crud_user,
)
from core.user.user_dto import UserRead
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_service import JobService


class ProjectService(metaclass=SingletonMeta):
    """Service to handle project creation and initialization."""

    def __new__(cls, *args, **kwargs):
        cls.fsr = FilesystemRepo()
        cls.es_repo = ElasticSearchRepo()
        cls.weaviate = WeaviateRepo()
        cls.js = JobService()
        cls.pts = PromptService()
        return super(ProjectService, cls).__new__(cls)

    def associate_user(self, *, db: Session, project_id: int, user_id: int) -> UserRead:
        crud_project.associate_user(db=db, project_id=project_id, user_id=user_id)
        return UserRead.model_validate(crud_user.read(db=db, id=user_id))

    def create_project(
        self, *, db: Session, create_dto: ProjectCreate, creating_user_id: int
    ) -> ProjectRead:
        # 1) create the project
        proj = crud_project.create(db=db, create_dto=create_dto)
        project_id = proj.id

        # 2) associate the system users
        self.associate_user(db=db, project_id=project_id, user_id=SYSTEM_USER_ID)
        self.associate_user(db=db, project_id=project_id, user_id=ASSISTANT_ZEROSHOT_ID)
        self.associate_user(db=db, project_id=project_id, user_id=ASSISTANT_FEWSHOT_ID)
        self.associate_user(db=db, project_id=project_id, user_id=ASSISTANT_TRAINED_ID)

        # 3) associate the user that created the project
        if creating_user_id not in [
            SYSTEM_USER_ID,
            ASSISTANT_ZEROSHOT_ID,
            ASSISTANT_FEWSHOT_ID,
            ASSISTANT_TRAINED_ID,
        ]:
            self.associate_user(db=db, project_id=project_id, user_id=creating_user_id)

        # 4) create system codes
        crud_code.create_system_codes_for_project(db=db, project_id=project_id)

        # 5) create project metadata
        crud_project_meta.create_project_metadata_for_project(
            db=db, project_id=project_id
        )

        # 6) create the default prompts
        self.pts.create_default_prompts(db=db, project_id=project_id)

        # 7) create filesystem directory structure
        self.fsr.create_directory_structure_for_project(project_id=project_id)

        # 8) create elasticsearch indices for this project
        client = self.es_repo.get_client()
        crud_sdoc_elastic.index.create_index(client=client, project_id=project_id)

        # 9) create weaviate tenants for this project
        client = self.weaviate.get_client()
        for collection in BaseCollection.all_collections():
            collection.create_tenant(client, project_id)

        # 10) re-load a fresh instance to avoid detachment
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def delete_project(self, *, db: Session, project_id: int) -> ProjectRead:
        # 1) delete the project and all connected data via cascading delete
        result = ProjectRead.model_validate(crud_project.delete(db=db, id=project_id))

        # 2) delete the files from filesystem
        self.fsr.purge_project_data(project_id=project_id)

        # 3) delete elasticsearch indices for this project
        client = self.es_repo.get_client()
        crud_sdoc_elastic.index.delete_index(client=client, project_id=project_id)

        # 4) delete weaviate embeddings (the tenants of this project)
        client = self.weaviate.get_client()
        for collection in BaseCollection.all_collections():
            collection.delete_tenant(client, project_id)

        # 5) delete redis entries for this project
        self.js.remove_jobs_by_project(project_id=project_id)

        return result
