from config import conf
from repos.db.sql_repo import SQLRepo
from startup import startup

answer = input(
    f"Really delete all data from postgres db '{conf.postgres.db}', redis, elasticsearch, etc.? [yes/No] "
)

if answer != "yes":
    print("Not deleting anything.")
    exit(1)

startup(reset_data=True, sql_echo=False)
SQLRepo().drop_database()
