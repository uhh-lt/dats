"""project_id in every key

Ids are unique per project only, so every primary key and unique constraint of a
project-owned table that names an id column also names project_id.

Revision ID: e5156f79bb2f
Revises: 55d36767e8ab
Create Date: 2026-11-26 10:45:48.734573

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5156f79bb2f"
down_revision: str | None = "55d36767e8ab"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# table: (old primary key name, old primary key columns, new primary key columns);
# project_id leads the new key, so the key replaces the index on project_id
PRIMARY_KEYS = {
    "classifiercodelinktable": (
        "classifiercodelinktable_pkey",
        ["classifier_id", "code_id"],
    ),
    "classifiertaglinktable": (
        "classifiertaglinktable_pkey",
        ["classifier_id", "tag_id"],
    ),
    "documentaspect": ("documentaspect_pkey", ["sdoc_id", "aspect_id"]),
    "documentcluster": ("documentcluster_pkey", ["sdoc_id", "cluster_id"]),
    "memofavoritelinktable": ("memofavoritelinktable_pkey", ["memo_id", "user_id"]),
    "memorecent": ("memorecent_pkey", ["user_id", "memo_id"]),
    "sourcedocumentstepstatus": ("sourcedocumentstepstatus_pkey", ["sdoc_id", "step"]),
    "sourcedocumenttaglinktable": (
        "sourcedocumentdocumenttaglinktable_pkey",
        ["source_document_id", "tag_id"],
    ),
    "spanannotationspangrouplinktable": (
        "spanannotationspangrouplinktable_pkey",
        ["span_annotation_id", "span_group_id"],
    ),
    "wordfrequency": ("wordfrequency_pkey", ["sdoc_id", "word"]),
}

# table: (name, old columns); the new constraint adds project_id in front
UNIQUE_CONSTRAINTS = {
    "annotationdocument": (
        "UC_annotationdocument_source_document_id_user_id",
        ["source_document_id", "user_id"],
    ),
    "experimentrun": (
        "UC_experiment_run_name_unique_per_experiment",
        ["experiment_id", "name"],
    ),
    "folder": ("UC_unique_folder_name_in_parent", ["parent_id", "name"]),
    "objecthandle": (
        "UC_only_one_object_handle_per_instance",
        [
            "attached_project_id",
            "code_id",
            "source_document_id",
            "span_annotation_id",
            "span_group_id",
            "bbox_annotation_id",
            "sentence_annotation_id",
            "tag_id",
        ],
    ),
    "promptversion": (
        "UC_prompt_version_unique_per_prompt",
        ["prompt_id", "version"],
    ),
    "sourcedocumentmetadata": (
        "UC_unique_metadata_sdoc_id_project_metadata_id",
        ["source_document_id", "project_metadata_id"],
    ),
}


def upgrade() -> None:
    for table, (name, columns) in PRIMARY_KEYS.items():
        op.drop_constraint(name, table, type_="primary")
        op.create_primary_key(f"{table}_pkey", table, ["project_id", *columns])
        op.drop_index(f"ix_{table}_project_id", table_name=table)
    for table, (name, columns) in UNIQUE_CONSTRAINTS.items():
        op.drop_constraint(name, table, type_="unique")
        op.create_unique_constraint(name, table, ["project_id", *columns])


def downgrade() -> None:
    for table, (name, columns) in UNIQUE_CONSTRAINTS.items():
        op.drop_constraint(name, table, type_="unique")
        op.create_unique_constraint(name, table, columns)
    for table, (name, columns) in PRIMARY_KEYS.items():
        op.create_index(f"ix_{table}_project_id", table, ["project_id"])
        op.drop_constraint(f"{table}_pkey", table, type_="primary")
        op.create_primary_key(name, table, columns)
