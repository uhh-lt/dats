import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from core.user.user_service import UserService
from core.user.user_utils import get_virtual_annotator_name
from modules.eximport.import_exceptions import ImportUsersError
from modules.eximport.user.user_export_schema import UserExportCollection


def import_users_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
    validate_only: bool = False,
) -> list[int]:
    """
    Import users from a DataFrame into a project.
    Validates input data and links existing users to the project. Virtual
    annotators ('virtual:<name>') are created unless the project has them.

    Args:
        db: Database session
        df: DataFrame with user data
        project_id: ID of the project to import users into
        validate_only: If True, only validate the data without importing

    Returns:
        List of imported user IDs

    Raises:
        ImportUsersError: If validation fails
    """
    # Validate input data using our schema
    try:
        user_collection = UserExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load user import data: {e}")
        raise ImportUsersError(errors=[f"Invalid data format for users: {e}"])

    logger.info(f"Importing {len(user_collection.users)} users...")

    error_messages = []

    # Check if the Users exists
    user_dict: dict[str, UserORM] = {}
    virtual_annotator_names: list[str] = []
    for user_schema in user_collection.users:
        name = get_virtual_annotator_name(user_schema.email)
        if name is not None:
            virtual_annotator_names.append(name)
            continue
        user = crud_user.read_by_email_if_exists(db=db, email=user_schema.email)
        if user is None:
            error_messages.append(f"User'{user_schema.email}' not found in the system.")
        else:
            user_dict[user_schema.email] = user

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing users:\n"
            + "\n".join(error_messages)
        )
        raise ImportUsersError(errors=error_messages)

    # If validate_only is True, we stop here
    if validate_only:
        logger.info("Validation successful. No users were imported.")
        return []

    # Everything is fine, we can create the virtual annotators ...
    for name in virtual_annotator_names:
        UserService().read_or_create_virtual_annotator(
            db=db, project_id=project_id, name=name
        )

    # ... and link the users to the project
    project_user_emails = {
        user.email for user in crud_project.read(db=db, id=project_id).users
    }
    imported_user_ids: list[int] = []
    for user_email, user in user_dict.items():
        # Check if the user is already associated with the project
        if user.email in project_user_emails:
            logger.info(
                f"User '{user.email}' is already part of the project {project_id}. Skipping..."
            )
            continue
        # Associate the user with the project
        imported_user = ProjectService().associate_user(
            db=db, project_id=project_id, user_id=user.id
        )
        imported_user_ids.append(imported_user.id)

    logger.info(
        f"Successfully linked {len(imported_user_ids)} users to project {project_id}."
    )
    return imported_user_ids
