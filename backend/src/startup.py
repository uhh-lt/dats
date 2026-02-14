import os
import random
import shutil
import time
import traceback

from loguru import logger
from sqlalchemy.orm import Session

#####################################################################################################################
#                                         READ BEFORE CHANGING ANYTHING                                             #
#####################################################################################################################
# 1. It's very important to NOT import any DATS internal models here, as this would lead to circular imports.       #
#    Import stuff online INSIDE the functions at the time you need it.                                              #
# 2. It's very important to NOT change the order of the imports, as this would lead to circular imports.            #
# 3. It's very important to NOT change the order of execution of the imports, DB initialization, and other          #
#    Services initializations.                                                                                      #
# 4. Are you sure you need to change this file? Are you sure you know what you wand and need to do? If you're not   #
#    sure, please ask Flo. Debugging the startup process is tidious ...                                             #
#####################################################################################################################


def startup(sql_echo: bool = False, reset_data: bool = False) -> None:
    UUID_NAMESPACE = os.environ.get("UUID_NAMESPACE", None)
    if UUID_NAMESPACE is None:
        logger.error("UUID_NAMESPACE environment variable is not set!")
        exit()
    progress_indicator_dir = f"/tmp/{UUID_NAMESPACE}"
    progress_indicator_file = f"{progress_indicator_dir}/DATS_START_UP_IN_PROGRESS"

    def is_startup_in_progress() -> bool:
        # Flo: sleep for some random time so that an eventual other process can create the file
        time.sleep(random.uniform(1, 2))
        if not os.path.exists(progress_indicator_file):
            os.makedirs(progress_indicator_dir, exist_ok=True)
            with open(progress_indicator_file, "w") as f:
                # Flo: write the PID, so we know which process created it
                f.write(f"{os.getpid()}")
            logger.debug(
                f"Created startup indicator file at: {progress_indicator_file}!"
            )
            return False

        logger.debug(
            f"Startup indicator file already exists at: {progress_indicator_file}!"
        )
        return True

    def delete_progress_indicator_file():
        if os.path.exists(progress_indicator_file):
            with open(progress_indicator_file, "r") as f:
                pid = int(f.readline().strip())
            if pid == os.getpid():
                try:
                    if os.path.isdir(progress_indicator_dir):
                        shutil.rmtree(progress_indicator_dir)
                        logger.debug(
                            f"Removed startup indicator directory and all contents at: {progress_indicator_dir}"
                        )
                except Exception as e:
                    logger.warning(
                        f"Could not remove directory {progress_indicator_dir}: {e}"
                    )

    """
    System Start Up Process
    """
    logger.info("Booting Discourse Analysis Tool Suite Backend ...")

    startup_in_progress = is_startup_in_progress()
    if startup_in_progress:
        logger.debug("Waiting for API startup process to be completed...")
        while os.path.exists(progress_indicator_file):
            time.sleep(1)

    # noinspection PyUnresolvedReferences
    try:
        import config

        config.verify_config()

        # start and init services
        __init_repos__(
            create_root_directory_structure=not startup_in_progress,
            sql_echo=sql_echo,
            reset_db=reset_data,
            reset_filesystem=reset_data,
            reset_elastic=reset_data,
            reset_vector=reset_data,
        )

        if not startup_in_progress:
            from migrations.run_migrations import run_migrations

            # If we're the first uvicorn worker to start,
            # run database migrations
            run_migrations()

        if not startup_in_progress:
            from repos.db.sql_repo import SQLRepo

            with SQLRepo().db_session() as db:
                __create_system_user__(db=db)
                __create_demo_user__(db=db)
                __create_assistant_users__(db=db)

        if not startup_in_progress:
            from repos.vector.weaviate_repo import WeaviateRepo

            with WeaviateRepo().weaviate_session() as client:
                __create_collections__(client=client)

    except Exception as e:
        msg = f"Error while booting the Discourse Analysis Tool Suite Backend! Exception: {str(e)}"
        logger.error(msg)
        logger.error(traceback.format_exc())
        raise SystemExit(msg)
    finally:
        delete_progress_indicator_file()

    delete_progress_indicator_file()
    logger.info("Booted Discourse Analysis Tool Suite Backend!")


# noinspection PyUnresolvedReferences,PyProtectedMember
def __init_repos__(
    create_root_directory_structure: bool = False,
    sql_echo: bool = False,
    reset_db: bool = False,
    reset_filesystem: bool = False,
    reset_elastic: bool = False,
    reset_vector: bool = False,
) -> None:
    # import and init RepoService
    from repos.filesystem_repo import FilesystemRepo

    fsr = FilesystemRepo()
    if create_root_directory_structure:
        fsr._create_root_directory_structure(remove_if_exists=reset_filesystem)

    # create SQL DBs and Tables
    from repos.db.sql_repo import SQLRepo

    SQLRepo(echo=sql_echo, reset_database=reset_db)

    # create CRUDs
    from common.crud_enum import Crud  # noqa: F401

    # import and init ElasticSearch
    from repos.elastic.elastic_repo import ElasticSearchRepo

    ElasticSearchRepo(flush=reset_elastic)

    # import and init Mail
    from repos.mail_repo import MailRepo

    MailRepo()

    # import and init Ray
    from repos.ray.ray_repo import RayRepo

    RayRepo()

    # import and init Weaviate
    from repos.vector.weaviate_repo import WeaviateRepo

    WeaviateRepo(flush=reset_vector)

    # import and init LLMRepo
    from repos.llm_repo import LLMRepo

    LLMRepo()

    # TODO: This should be a repo, no?
    # import and init AuthService
    from core.auth.oauth_service import OAuthService

    OAuthService()


def __create_system_user__(db: Session) -> None:
    from config import conf
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    if not crud_user.exists(db=db, id=1):
        # TODO Flo: this is not nice.. make sure system user cannot be changed, seen from outside, login, etc
        create_dto = UserCreate(
            email=str(conf.system_user.email),
            first_name=str(conf.system_user.first_name),
            last_name=str(conf.system_user.last_name),
            password=str(conf.system_user.password),
        )
        crud_user.create(db=db, create_dto=create_dto)


def __create_demo_user__(db: Session) -> None:
    from config import conf
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    if not crud_user.exists(db=db, id=2):
        create_dto = UserCreate(
            email=str(conf.demo_user.email),
            first_name=str(conf.demo_user.first_name),
            last_name=str(conf.demo_user.last_name),
            password=str(conf.demo_user.password),
        )
        crud_user.create(db=db, create_dto=create_dto)


def __create_assistant_users__(db: Session) -> None:
    from config import conf
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    for user_id, last_name in [
        (9990, "ZeroShot"),
        (9991, "FewShot"),
        (9992, "Trained"),
    ]:
        if not crud_user.exists(db=db, id=user_id):
            create_dto = UserCreate(
                email=f"assistant-{last_name.lower()}@"
                + str(conf.assistant_user.email.split("@")[1]),
                first_name=str(conf.assistant_user.first_name),
                last_name=last_name,
                password=str(conf.assistant_user.password),
            )
            crud_user.create_with_id(db=db, create_dto=create_dto, id=user_id)


def __create_collections__(client) -> None:
    from core.doc.document_collection import DocumentCollection
    from core.doc.image_collection import ImageCollection
    from core.doc.sentence_collection import SentenceCollection
    from modules.perspectives.aspect.aspect_collection import AspectCollection
    from modules.perspectives.cluster.cluster_collection import ClusterCollection

    DocumentCollection.create_collection(client)
    SentenceCollection.create_collection(client)
    ImageCollection.create_collection(client)
    AspectCollection.create_collection(client)
    ClusterCollection.create_collection(client)
