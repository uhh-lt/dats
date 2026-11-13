import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import BEFORE_CAPTIONS_CORE, CAPTIONS_CORE, alembic_config


def _project(db: Session, project_id: int) -> tuple[list[str], dict[str, str]]:
    """The enabled features and the pending activations of the project."""
    db.expire_all()
    row = db.execute(
        sa.text(
            "SELECT enabled_features, feature_activations FROM project WHERE id = :id"
        ),
        {"id": project_id},
    ).one()
    db.commit()
    return list(row.enabled_features), dict(row.feature_activations)


# ===========================================================================
# DROP THE IMAGE CAPTIONS TOGGLE (41c2d56be9f3) TESTS
# ===========================================================================


def test_upgrade_drops_the_image_captions_feature_and_its_activation(
    db_session: Session, image_captions_toggle_database: int
):
    """The project keeps full-text search and its activation; the feature
    "image_captions" and its activation are gone."""
    command.upgrade(alembic_config(), CAPTIONS_CORE)

    assert _project(db_session, image_captions_toggle_database) == (
        ["full_text_search"],
        {"full_text_search": "a2"},
    )


def test_downgrade_keeps_the_project_as_it_is(
    db_session: Session, image_captions_toggle_database: int
):
    """The downgrade does not bring the feature back."""
    config = alembic_config()
    command.upgrade(config, CAPTIONS_CORE)
    command.downgrade(config, BEFORE_CAPTIONS_CORE)

    assert _project(db_session, image_captions_toggle_database) == (
        ["full_text_search"],
        {"full_text_search": "a2"},
    )
