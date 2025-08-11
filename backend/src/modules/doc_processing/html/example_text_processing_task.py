import sys
from time import sleep

from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.user.user_crud import SYSTEM_USER_ID, crud_user
from repos.db.sql_repo import SQLRepo


def create_project_task() -> int:
    """
    Example function that will be performed in a virtual environment.

    Importing at the module level ensures that it will not attempt to import the
    library before it is installed.
    """

    print(f"Running task via {sys.executable}")
    print("Sleeping")
    for _ in range(4):
        print("Please wait...", flush=True)
        sleep(1)
    print("Finished")

    with SQLRepo().db_session() as db:
        user = crud_user.read(db=db, id=SYSTEM_USER_ID)
        db_obj = crud_project.create(
            db=db,
            create_dto=ProjectCreate(
                title="Example Project",
                description="This is an example project created by an external Python task.",
            ),
            creating_user=user,
        )
        return db_obj.id
