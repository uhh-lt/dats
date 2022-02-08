from loguru import logger

from app.db.sql_service import SQLService

if __name__ == "__main__":
    try:
        logger.info("Booting D-WISE Tool Suite Backend ...")
        SQLService()._create_database_and_tables(drop_if_exists=True)
        logger.info("Started D-WISE Tool Suite Backend!")

    except Exception as e:
        msg = f"Error while starting the API! Exception: {str(e)}"
        logger.error(msg)
        raise SystemExit(msg)
