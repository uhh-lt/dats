import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import COMPOSITE_KEYS, alembic_config, rows_by_project

# the tables that belong to no project; every other table is project-owned
GLOBAL_TABLES = {
    "alembic_version",
    "apikey",
    "project",
    "projectuserlinktable",
    "refreshtoken",
    "spantext",
    "user",
}

# the composite foreign key (project_id, <column>) of every project-owned table
# onto (project_id, id) of a project-owned table, with its ON DELETE action
CASCADE = "CASCADE"
COMPOSITE_FOREIGN_KEYS: dict[tuple[str, str], tuple[str, str | None]] = {
    ("annotationdocument", "source_document_id"): ("sourcedocument", CASCADE),
    ("aspect", "tag_id"): ("tag", CASCADE),
    ("bboxannotation", "annotation_document_id"): ("annotationdocument", CASCADE),
    ("bboxannotation", "code_id"): ("code", CASCADE),
    ("bboxannotation", "source_annotation_id"): (
        "bboxannotation",
        "SET NULL (source_annotation_id)",
    ),
    ("bboxannotation", "source_code_id"): ("code", "SET NULL (source_code_id)"),
    ("classifiercodelinktable", "classifier_id"): ("classifier", CASCADE),
    ("classifiercodelinktable", "code_id"): ("code", CASCADE),
    ("classifierevaluation", "classifier_id"): ("classifier", CASCADE),
    ("classifiertaglinktable", "classifier_id"): ("classifier", CASCADE),
    ("classifiertaglinktable", "tag_id"): ("tag", CASCADE),
    ("cluster", "aspect_id"): ("aspect", CASCADE),
    ("cluster", "parent_cluster_id"): ("cluster", "SET NULL (parent_cluster_id)"),
    ("code", "parent_id"): ("code", CASCADE),
    ("documentaspect", "aspect_id"): ("aspect", CASCADE),
    ("documentaspect", "sdoc_id"): ("sourcedocument", CASCADE),
    ("documentcluster", "cluster_id"): ("cluster", CASCADE),
    ("documentcluster", "sdoc_id"): ("sourcedocument", CASCADE),
    ("experimentrun", "experiment_id"): ("experiment", CASCADE),
    ("experimentrun", "prompt_version_id"): ("promptversion", CASCADE),
    ("folder", "parent_id"): ("folder", CASCADE),
    ("memo", "attached_to_id"): ("objecthandle", CASCADE),
    ("memofavoritelinktable", "memo_id"): ("memo", CASCADE),
    ("memorecent", "memo_id"): ("memo", CASCADE),
    ("objecthandle", "bbox_annotation_id"): ("bboxannotation", CASCADE),
    ("objecthandle", "code_id"): ("code", CASCADE),
    ("objecthandle", "sentence_annotation_id"): ("sentenceannotation", CASCADE),
    ("objecthandle", "source_document_id"): ("sourcedocument", CASCADE),
    ("objecthandle", "span_annotation_id"): ("spanannotation", CASCADE),
    ("objecthandle", "span_group_id"): ("spangroup", CASCADE),
    ("objecthandle", "tag_id"): ("tag", CASCADE),
    ("promptversion", "prompt_id"): ("prompt", CASCADE),
    ("sentenceannotation", "annotation_document_id"): ("annotationdocument", CASCADE),
    ("sentenceannotation", "code_id"): ("code", CASCADE),
    ("sentenceannotation", "source_annotation_id"): (
        "sentenceannotation",
        "SET NULL (source_annotation_id)",
    ),
    ("sentenceannotation", "source_code_id"): ("code", "SET NULL (source_code_id)"),
    ("sourcedocument", "folder_id"): ("folder", CASCADE),
    ("sourcedocumentdata", "id"): ("sourcedocument", CASCADE),
    ("sourcedocumentmetadata", "project_metadata_id"): ("projectmetadata", CASCADE),
    ("sourcedocumentmetadata", "source_document_id"): ("sourcedocument", CASCADE),
    ("sourcedocumentstepstatus", "sdoc_id"): ("sourcedocument", CASCADE),
    ("sourcedocumenttaglinktable", "source_document_id"): ("sourcedocument", CASCADE),
    ("sourcedocumenttaglinktable", "tag_id"): ("tag", CASCADE),
    ("spanannotation", "annotation_document_id"): ("annotationdocument", CASCADE),
    ("spanannotation", "code_id"): ("code", CASCADE),
    ("spanannotation", "source_annotation_id"): (
        "spanannotation",
        "SET NULL (source_annotation_id)",
    ),
    ("spanannotation", "source_code_id"): ("code", "SET NULL (source_code_id)"),
    ("spanannotationspangrouplinktable", "span_annotation_id"): (
        "spanannotation",
        CASCADE,
    ),
    ("spanannotationspangrouplinktable", "span_group_id"): ("spangroup", CASCADE),
    ("spangroup", "annotation_document_id"): ("annotationdocument", CASCADE),
    ("tag", "parent_id"): ("tag", CASCADE),
    ("tagrecommendationlink", "predicted_tag_id"): ("tag", CASCADE),
    ("tagrecommendationlink", "source_document_id"): ("sourcedocument", CASCADE),
    ("wordfrequency", "sdoc_id"): ("sourcedocument", CASCADE),
}


def _project_owned_tables(inspector: sa.Inspector) -> list[str]:
    return [t for t in inspector.get_table_names() if t not in GLOBAL_TABLES]


# ===========================================================================
# COMPOSITE KEYS (e9c943a5f56d) TESTS
# ===========================================================================

# --- A. the schema at head --------------------------------------------------
# Asserted through the inspector: alembic autogenerate does not compare primary
# keys, and #928 swaps them to (project_id, id) on top of this schema.


def test_every_project_owned_table_has_a_not_null_project_id(db_session: Session):
    """Every project-owned table has a NOT NULL project_id with a cascading
    foreign key onto the project."""
    inspector = sa.inspect(db_session.get_bind())

    for table in _project_owned_tables(inspector):
        columns = {c["name"]: c for c in inspector.get_columns(table)}
        assert "project_id" in columns, table
        assert columns["project_id"]["nullable"] is False, table
        project_keys = [
            fk
            for fk in inspector.get_foreign_keys(table)
            if fk["referred_table"] == "project"
            and fk["constrained_columns"] == ["project_id"]
        ]
        assert len(project_keys) == 1, table
        assert project_keys[0].get("options", {}).get("ondelete") == CASCADE, table


def test_every_project_owned_table_with_an_id_is_unique_per_project_and_id(
    db_session: Session,
):
    """UNIQUE (project_id, id) on every project-owned table with an id column,
    the target of the composite foreign keys."""
    inspector = sa.inspect(db_session.get_bind())

    for table in _project_owned_tables(inspector):
        if "id" not in {c["name"] for c in inspector.get_columns(table)}:
            continue
        assert {
            "name": f"UC_{table}_project_id_id",
            "column_names": ["project_id", "id"],
        } in [
            {"name": uc["name"], "column_names": uc["column_names"]}
            for uc in inspector.get_unique_constraints(table)
        ], table


def test_foreign_keys_onto_project_owned_tables_are_composite(db_session: Session):
    """Every foreign key onto a project-owned table is (project_id, <column>) onto
    (project_id, id), named FK_<table>_<column>, and they are exactly the
    expected ones: a reference into another project cannot be stored."""
    inspector = sa.inspect(db_session.get_bind())
    owned = set(_project_owned_tables(inspector))

    found: dict[tuple[str, str], tuple[str, str | None]] = {}
    for table in owned:
        for fk in inspector.get_foreign_keys(table):
            if fk["referred_table"] not in owned:
                continue
            columns = fk["constrained_columns"]
            assert columns[0] == "project_id" and len(columns) == 2, (table, fk)
            assert fk["referred_columns"] == ["project_id", "id"], (table, fk)
            assert fk["name"] == f"FK_{table}_{columns[1]}", (table, fk)
            found[(table, columns[1])] = (
                fk["referred_table"],
                fk.get("options", {}).get("ondelete"),
            )

    assert found == COMPOSITE_FOREIGN_KEYS


def test_foreign_keys_onto_global_tables_stay_plain(db_session: Session):
    """Foreign keys onto users, the project and span texts have one column, and
    the virtual user of an experiment run keeps the name that the project
    deletion defers."""
    inspector = sa.inspect(db_session.get_bind())

    for table in _project_owned_tables(inspector):
        for fk in inspector.get_foreign_keys(table):
            if fk["referred_table"] in GLOBAL_TABLES:
                assert len(fk["constrained_columns"]) == 1, (table, fk)
    assert "experimentrun_virtual_user_id_fkey" in {
        fk["name"] for fk in inspector.get_foreign_keys("experimentrun")
    }


def test_object_handle_refers_to_its_attached_project_separately(
    db_session: Session,
):
    """The handle's project_id is the project it belongs to; the attached project
    moved to attached_project_id, and the handle columns of users and memos are
    gone."""
    inspector = sa.inspect(db_session.get_bind())

    columns = {c["name"] for c in inspector.get_columns("objecthandle")}

    assert {"project_id", "attached_project_id"} <= columns
    assert not {"user_id", "memo_id"} & columns
    assert {
        "CC_object_handle_refers_to_exactly_one_instance",
        "CC_object_handle_attached_project_is_own_project",
    } <= {cc["name"] for cc in inspector.get_check_constraints("objecthandle")}


# --- B. the data migration ---------------------------------------------------


def test_upgrade_fills_the_project_id_from_the_parents(
    db_session: Session,
    before_composite_keys_database: dict[str, dict[int, int]],
):
    """Every row of every table that gets a project_id gets the project of the
    parent it belongs to: the rows per project are the same as before the
    downgrade, one in each of the two projects (the composite foreign keys,
    created after the fill, reject any other value)."""
    command.upgrade(alembic_config(), COMPOSITE_KEYS)

    assert rows_by_project(db_session) == before_composite_keys_database
    assert all(len(rows) == 2 for rows in before_composite_keys_database.values())
