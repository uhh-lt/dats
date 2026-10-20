import argparse
import traceback

from loguru import logger

from bootstrap import init_logging, setup_data_stores
from config import conf
from utils.banner import print_dats_banner


def setup_dats(sql_echo: bool = False, reset_data: bool = False) -> None:
    print_dats_banner()
    logger.info(f"Setting up Discourse Analysis Tool Suite (v{conf.api.version}) ...")

    try:
        setup_data_stores(delete_existing_data=reset_data, sql_echo=sql_echo)
    except Exception as e:
        msg = f"Error while running setup script! Exception: {str(e)}"
        logger.error(msg)
        logger.error(traceback.format_exc())
        raise SystemExit(msg)

    logger.info(
        f"Discourse Analysis Tool Suite (v{conf.api.version}) Setup Completed Successfully!"
    )


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

    init_logging()
    setup_dats(sql_echo=args.sql_echo, reset_data=args.reset_data)
