import os
import random
import time
import traceback

from loguru import logger

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
    progress_indicator_file = "/tmp/DATS_START_UP_IN_PROGRESS"

    def is_startup_in_progress() -> bool:
        # Flo: sleep for some random time so that an eventual other process can create the file
        time.sleep(random.uniform(1, 2))
        if not os.path.exists(progress_indicator_file):
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
            if pid == os.getpid() and os.path.exists(progress_indicator_file):
                logger.debug(
                    f"Removing startup indicator file at: {progress_indicator_file}"
                )
                os.remove(progress_indicator_file)

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
            __create_system_user__()
            __create_demo_user__()
            __create_assistant_users__()

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
    from repos.ray_repo import RayRepo

    RayRepo()

    # import and init Weaviate
    from repos.vector.weaviate_repo import WeaviateRepo

    WeaviateRepo(flush=reset_vector)

    # import and init Ollama
    from repos.ollama_repo import OllamaRepo

    OllamaRepo()

    # TODO: This should be a repo, no?
    # import and init AuthService
    from core.auth.oauth_service import OAuthService

    OAuthService()


def __create_system_user__() -> None:
    from config import conf
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate
    from repos.db.sql_repo import SQLRepo

    with SQLRepo().db_session() as db_session:
        if not crud_user.exists(db=db_session, id=1):
            # TODO Flo: this is not nice.. make sure system user cannot be changed, seen from outside, login, etc
            create_dto = UserCreate(
                email=str(conf.system_user.email),
                first_name=str(conf.system_user.first_name),
                last_name=str(conf.system_user.last_name),
                password=str(conf.system_user.password),
            )
            crud_user.create(db=db_session, create_dto=create_dto)


def __create_demo_user__() -> None:
    from config import conf
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate
    from repos.db.sql_repo import SQLRepo

    with SQLRepo().db_session() as db_session:
        if not crud_user.exists(db=db_session, id=2):
            create_dto = UserCreate(
                email=str(conf.demo_user.email),
                first_name=str(conf.demo_user.first_name),
                last_name=str(conf.demo_user.last_name),
                password=str(conf.demo_user.password),
            )
            crud_user.create(db=db_session, create_dto=create_dto)


def __create_assistant_users__() -> None:
    from config import conf
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate
    from repos.db.sql_repo import SQLRepo

    with SQLRepo().db_session() as db_session:
        for user_id, last_name in [
            (9990, "ZeroShot"),
            (9991, "FewShot"),
            (9992, "Trained"),
        ]:
            if not crud_user.exists(db=db_session, id=user_id):
                create_dto = UserCreate(
                    email=f"assistant-{last_name.lower()}@"
                    + str(conf.assistant_user.email.split("@")[1]),
                    first_name=str(conf.assistant_user.first_name),
                    last_name=last_name,
                    password=str(conf.assistant_user.password),
                )
                crud_user.create_with_id(
                    db=db_session, create_dto=create_dto, id=user_id
                )
