from app.core.db.sql_service import SQLService
from app.core.startup import startup
from config import conf

answer = input(
    f"Really delete all data from postgres db '{conf.postgres.db}', redis, elasticsearch, etc.? [yes/No] "
)

if answer != "yes":
    print("Not deleting anything.")
    exit(1)

startup(reset_data=True, sql_echo=False)
SQLService().drop_database()
