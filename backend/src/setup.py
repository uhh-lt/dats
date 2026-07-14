import argparse
import traceback

from loguru import logger
from sqlalchemy.orm import Session

from config import conf


def setup_dats(sql_echo: bool = False, reset_data: bool = False) -> None:
    logger.info(f"Setting up Discourse Analysis Tool Suite (v{conf.api.version}) ...")

    try:
        ######################
        # 1. Init Filesystem #
        ######################
        from repos.filesystem_repo import FilesystemRepo

        fsr = FilesystemRepo()
        fsr._create_root_directory_structure(remove_if_exists=reset_data)

        ########################
        # 2. Init SQL Database #
        ########################
        from migrations.run_migrations import run_migrations
        from repos.db.sql_repo import SQLRepo

        SQLRepo(echo=sql_echo, remove_if_exists=reset_data)

        logger.info("Running Database Migrations...")
        run_migrations()
        logger.info("Database Migrations Completed Successfully!")

        with SQLRepo().transaction() as db:
            _create_system_user(db=db)
            _create_demo_user(db=db)
            _create_assistant_users(db=db)

        #########################
        # 3. Init ElasticSearch #
        #########################
        from repos.elastic.elastic_repo import ElasticSearchRepo

        ElasticSearchRepo(remove_if_exists=reset_data)

        ####################
        # 4. Init Weaviate #
        ####################
        from repos.vector.weaviate_repo import WeaviateRepo

        weaviate_repo = WeaviateRepo(remove_if_exists=reset_data)
        with weaviate_repo.weaviate_session() as client:
            _create_weaviate_colllections(client=client)

        #################
        # 5. Init Redis #
        #################
        from repos.redis_repo import RedisRepo

        RedisRepo(remove_if_exists=reset_data)

        logger.info(
            f"Discourse Analysis Tool Suite (v{conf.api.version}) Setup Completed Successfully!"
        )

    except Exception as e:
        msg = f"Error while running setup script! Exception: {str(e)}"
        logger.error(msg)
        logger.error(traceback.format_exc())
        raise SystemExit(msg)


def _create_system_user(db: Session) -> None:
    from config import conf
    from core.user.user_crud import SYSTEM_USER_ID, crud_user
    from core.user.user_dto import UserCreate

    if not crud_user.exists(db=db, id=SYSTEM_USER_ID):
        logger.info("Creating System User...")
        create_dto = UserCreate(
            email=conf.system_user.email,
            first_name=conf.system_user.first_name,
            last_name=conf.system_user.last_name,
            password=conf.system_user.password.get_secret_value(),
        )
        crud_user.create(db=db, create_dto=create_dto)


def _create_demo_user(db: Session) -> None:
    from config import conf
    from core.user.user_crud import DEMO_USER_ID, crud_user
    from core.user.user_dto import UserCreate

    if not crud_user.exists(db=db, id=DEMO_USER_ID):
        logger.info("Creating Demo User...")
        create_dto = UserCreate(
            email=conf.demo_user.email,
            first_name=conf.demo_user.first_name,
            last_name=conf.demo_user.last_name,
            password=conf.demo_user.password.get_secret_value(),
        )
        crud_user.create(db=db, create_dto=create_dto)


def _create_assistant_users(db: Session) -> None:
    from config import conf
    from core.user.user_crud import (
        ASSISTANT_FEWSHOT_ID,
        ASSISTANT_TRAINED_ID,
        ASSISTANT_ZEROSHOT_ID,
        crud_user,
    )
    from core.user.user_dto import UserCreate

    for user_id, last_name in [
        (ASSISTANT_ZEROSHOT_ID, "ZeroShot"),
        (ASSISTANT_FEWSHOT_ID, "FewShot"),
        (ASSISTANT_TRAINED_ID, "Trained"),
    ]:
        if not crud_user.exists(db=db, id=user_id):
            logger.info(f"Creating Assistant User: {last_name}")
            create_dto = UserCreate(
                email=f"assistant-{last_name.lower()}@"
                + conf.assistant_user.email.split("@")[1],
                first_name=conf.assistant_user.first_name,
                last_name=last_name,
                password=conf.assistant_user.password.get_secret_value(),
            )
            crud_user.create_with_id(db=db, create_dto=create_dto, id=user_id)


def _create_weaviate_colllections(client) -> None:
    from core.doc.document_collection import DocumentCollection
    from core.doc.image_collection import ImageCollection
    from core.doc.sentence_collection import SentenceCollection
    from modules.perspectives.aspect_collection import AspectCollection
    from modules.perspectives.cluster_collection import ClusterCollection

    DocumentCollection.create_collection(client)
    SentenceCollection.create_collection(client)
    ImageCollection.create_collection(client)
    AspectCollection.create_collection(client)
    ClusterCollection.create_collection(client)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DATS Setup Script")
    parser.add_argument(
        "--reset-data",
        action="store_true",
        help="Reset all data in DB, Redis, Weaviate, etc.",
    )
    parser.add_argument(
        "--sql-echo", action="store_true", help="Enable SQL echoing for debugging."
    )

    args = parser.parse_args()

    setup_dats(sql_echo=args.sql_echo, reset_data=args.reset_data)
