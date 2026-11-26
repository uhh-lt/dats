"""key every project-owned table by its project

Every project-owned table carries its project, and Postgres rejects references
across projects (#927, #928):

1. objecthandle: the column of the attached project becomes attached_project_id,
   project_id becomes the project the handle belongs to.
2. project_id NOT NULL on the tables that had none, filled from their parents. A
   row without a parent (or a handle of a user or a memo) fails the NOT NULL, a
   row whose parent lies in another project fails a composite foreign key: the
   migration rolls back.
3. The foreign keys onto id alone and the handle columns of users and memos
   (production has no such handles) are dropped.
4. Ids are unique per project only, so every key names project_id first:
   every project-owned table with an id gets the primary key (project_id, id),
   the tables keyed by their references get project_id in front of their
   primary key, and the unique constraints over id columns start with
   project_id. The annotation documents were keyed by (source_document_id,
   user_id), which becomes a unique constraint. The indexes on project_id alone
   that the new primary keys cover are dropped. Autogenerate does not detect
   primary key changes, so they are written by hand.
5. The foreign keys onto the project and the composite foreign keys
   (project_id, <column>) onto (project_id, id).
6. The names left over from the tables' former names follow the current names.

The downgrade restores the schema before (the dropped handle columns come back
empty), because the migration tests downgrade through head.

Revision ID: 7f1bbe0f69d7
Revises: 807bab97f373
Create Date: 2026-11-26 11:02:41.118220

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f1bbe0f69d7"
down_revision: str | None = "807bab97f373"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, parent, column): the tables that get a project_id, filled from the
# parent that <column> references, in dependency order
_FILLED: list[tuple[str, str, str]] = [
    ("annotationdocument", "sourcedocument", "source_document_id"),
    ("sourcedocumentdata", "sourcedocument", "id"),
    ("sourcedocumentmetadata", "sourcedocument", "source_document_id"),
    ("sourcedocumenttaglinktable", "sourcedocument", "source_document_id"),
    ("sourcedocumentstepstatus", "sourcedocument", "sdoc_id"),
    ("wordfrequency", "sourcedocument", "sdoc_id"),
    ("tagrecommendationlink", "sourcedocument", "source_document_id"),
    ("documentaspect", "sourcedocument", "sdoc_id"),
    ("documentcluster", "sourcedocument", "sdoc_id"),
    ("spangroup", "annotationdocument", "annotation_document_id"),
    ("spanannotationspangrouplinktable", "spanannotation", "span_annotation_id"),
    ("memofavoritelinktable", "memo", "memo_id"),
    ("memorecent", "memo", "memo_id"),
    ("promptversion", "prompt", "prompt_id"),
    ("classifiercodelinktable", "classifier", "classifier_id"),
    ("classifiertaglinktable", "classifier", "classifier_id"),
    ("classifierevaluation", "classifier", "classifier_id"),
    ("experimentrun", "experiment", "experiment_id"),
    ("cluster", "aspect", "aspect_id"),
]

# the tables with a new project_id: the filled ones and objecthandle
_NEW_PROJECT_ID = [*(table for table, _, _ in _FILLED), "objecthandle"]

# table -> (name, columns) of its primary key before this revision; every one
# becomes <table>_pkey (project_id, id)
_OLD_PKEYS: dict[str, tuple[str, list[str]]] = {
    "annotationdocument": (
        "annotationdocument_pkey",
        ["source_document_id", "user_id"],
    ),
    "aspect": ("aspect_pkey", ["id"]),
    "bboxannotation": ("bboxannotation_pkey", ["id"]),
    "classifier": ("classifier_pkey", ["id"]),
    "classifierevaluation": ("classifierevaluation_pkey", ["id"]),
    "cluster": ("cluster_pkey", ["id"]),
    "code": ("code_pkey", ["id"]),
    "conceptovertimeanalysis": ("conceptovertimeanalysis_pkey", ["id"]),
    "experiment": ("experiment_pkey", ["id"]),
    "experimentrun": ("experimentrun_pkey", ["id"]),
    "folder": ("folder_pkey", ["id"]),
    "memo": ("memo_pkey", ["id"]),
    "objecthandle": ("objecthandle_pkey", ["id"]),
    "projectmetadata": ("projectmetadata_pkey", ["id"]),
    "prompt": ("prompt_pkey", ["id"]),
    "promptversion": ("promptversion_pkey", ["id"]),
    "searchview": ("searchview_pkey", ["id"]),
    "sentenceannotation": ("sentenceannotation_pkey", ["id"]),
    "sourcedocument": ("sourcedocument_pkey", ["id"]),
    "sourcedocumentdata": ("sourcedocumentdata_pkey", ["id"]),
    "sourcedocumentmetadata": ("sourcedocumentmetadata_pkey", ["id"]),
    "spanannotation": ("spanannotation_pkey", ["id"]),
    "spangroup": ("spangroup_pkey", ["id"]),
    "tag": ("documenttag_pkey", ["id"]),
    "tagrecommendationlink": ("documenttagrecommendationlink_pkey", ["id"]),
    "timelineanalysis": ("timelineanalysis_pkey", ["id"]),
    "whiteboard": ("whiteboard_pkey", ["id"]),
}

# table -> (name, columns) of the primary key of a table keyed by its
# references before this revision; each becomes <table>_pkey with project_id in
# front of the columns
_OLD_REFERENCE_PKEYS: dict[str, tuple[str, list[str]]] = {
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

# table -> (name, columns) of a unique constraint over id columns before this
# revision; each gets project_id in front of the columns
_OLD_UNIQUE_CONSTRAINTS: dict[str, tuple[str, list[str]]] = {
    "experimentrun": (
        "UC_experiment_run_name_unique_per_experiment",
        ["experiment_id", "name"],
    ),
    "folder": ("UC_unique_folder_name_in_parent", ["parent_id", "name"]),
    "promptversion": (
        "UC_prompt_version_unique_per_prompt",
        ["prompt_id", "version"],
    ),
    "sourcedocumentmetadata": (
        "UC_unique_metadata_sdoc_id_project_metadata_id",
        ["source_document_id", "project_metadata_id"],
    ),
}

# the tables that had a project_id with an index of its own, which the primary
# key (project_id, id) covers
_COVERED_PROJECT_ID_INDEXES = [
    "aspect",
    "bboxannotation",
    "classifier",
    "code",
    "conceptovertimeanalysis",
    "experiment",
    "folder",
    "memo",
    "projectmetadata",
    "prompt",
    "searchview",
    "sentenceannotation",
    "sourcedocument",
    "spanannotation",
    "tag",
    "timelineanalysis",
    "whiteboard",
]

# (name, table, column, referenced table, ON DELETE): the foreign keys onto id
# alone before this revision
_OLD_FOREIGN_KEYS: list[tuple[str, str, str, str, str]] = [
    (
        "annotationdocument_source_document_id_fkey",
        "annotationdocument",
        "source_document_id",
        "sourcedocument",
        "CASCADE",
    ),
    ("aspect_tag_id_fkey", "aspect", "tag_id", "tag", "CASCADE"),
    (
        "FK_bbox_annotation_source_annotation_id",
        "bboxannotation",
        "source_annotation_id",
        "bboxannotation",
        "SET NULL",
    ),
    (
        "bboxannotation_annotation_document_id_fkey",
        "bboxannotation",
        "annotation_document_id",
        "annotationdocument",
        "CASCADE",
    ),
    (
        "FK_bbox_annotation_source_code_id",
        "bboxannotation",
        "source_code_id",
        "code",
        "SET NULL",
    ),
    ("bboxannotation_code_id_fkey", "bboxannotation", "code_id", "code", "CASCADE"),
    (
        "classifiercodelinktable_classifier_id_fkey",
        "classifiercodelinktable",
        "classifier_id",
        "classifier",
        "CASCADE",
    ),
    (
        "classifiercodelinktable_code_id_fkey",
        "classifiercodelinktable",
        "code_id",
        "code",
        "CASCADE",
    ),
    (
        "classifierevaluation_classifier_id_fkey",
        "classifierevaluation",
        "classifier_id",
        "classifier",
        "CASCADE",
    ),
    (
        "classifiertaglinktable_tag_id_fkey",
        "classifiertaglinktable",
        "tag_id",
        "tag",
        "CASCADE",
    ),
    (
        "classifiertaglinktable_classifier_id_fkey",
        "classifiertaglinktable",
        "classifier_id",
        "classifier",
        "CASCADE",
    ),
    (
        "cluster_parent_cluster_id_fkey",
        "cluster",
        "parent_cluster_id",
        "cluster",
        "SET NULL",
    ),
    ("cluster_aspect_id_fkey", "cluster", "aspect_id", "aspect", "CASCADE"),
    ("code_parent_code_id_fkey", "code", "parent_id", "code", "CASCADE"),
    (
        "documentaspect_aspect_id_fkey",
        "documentaspect",
        "aspect_id",
        "aspect",
        "CASCADE",
    ),
    (
        "documentaspect_sdoc_id_fkey",
        "documentaspect",
        "sdoc_id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "documentcluster_sdoc_id_fkey",
        "documentcluster",
        "sdoc_id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "documentcluster_cluster_id_fkey",
        "documentcluster",
        "cluster_id",
        "cluster",
        "CASCADE",
    ),
    (
        "experimentrun_experiment_id_fkey",
        "experimentrun",
        "experiment_id",
        "experiment",
        "CASCADE",
    ),
    (
        "experimentrun_prompt_version_id_fkey",
        "experimentrun",
        "prompt_version_id",
        "promptversion",
        "CASCADE",
    ),
    ("folder_parent_id_fkey", "folder", "parent_id", "folder", "CASCADE"),
    (
        "memo_attached_to_id_fkey",
        "memo",
        "attached_to_id",
        "objecthandle",
        "CASCADE",
    ),
    (
        "memofavoritelinktable_memo_id_fkey",
        "memofavoritelinktable",
        "memo_id",
        "memo",
        "CASCADE",
    ),
    ("memorecent_memo_id_fkey", "memorecent", "memo_id", "memo", "CASCADE"),
    (
        "objecthandle_span_group_id_fkey",
        "objecthandle",
        "span_group_id",
        "spangroup",
        "CASCADE",
    ),
    ("objecthandle_memo_id_fkey", "objecthandle", "memo_id", "memo", "CASCADE"),
    (
        "objecthandle_source_document_id_fkey",
        "objecthandle",
        "source_document_id",
        "sourcedocument",
        "CASCADE",
    ),
    ("objecthandle_code_id_fkey", "objecthandle", "code_id", "code", "CASCADE"),
    (
        "objecthandle_span_annotation_id_fkey",
        "objecthandle",
        "span_annotation_id",
        "spanannotation",
        "CASCADE",
    ),
    ("objecthandle_user_id_fkey", "objecthandle", "user_id", "user", "CASCADE"),
    ("objecthandle_tag_id_fkey", "objecthandle", "tag_id", "tag", "CASCADE"),
    (
        "objecthandle_sentence_annotation_id_fkey",
        "objecthandle",
        "sentence_annotation_id",
        "sentenceannotation",
        "CASCADE",
    ),
    (
        "objecthandle_bbox_annotation_id_fkey",
        "objecthandle",
        "bbox_annotation_id",
        "bboxannotation",
        "CASCADE",
    ),
    (
        "promptversion_prompt_id_fkey",
        "promptversion",
        "prompt_id",
        "prompt",
        "CASCADE",
    ),
    (
        "sentenceannotation_code_id_fkey",
        "sentenceannotation",
        "code_id",
        "code",
        "CASCADE",
    ),
    (
        "FK_sentence_annotation_source_code_id",
        "sentenceannotation",
        "source_code_id",
        "code",
        "SET NULL",
    ),
    (
        "sentenceannotation_annotation_document_id_fkey",
        "sentenceannotation",
        "annotation_document_id",
        "annotationdocument",
        "CASCADE",
    ),
    (
        "FK_sentence_annotation_source_annotation_id",
        "sentenceannotation",
        "source_annotation_id",
        "sentenceannotation",
        "SET NULL",
    ),
    (
        "fk_sourcedocument_folder_id",
        "sourcedocument",
        "folder_id",
        "folder",
        "CASCADE",
    ),
    (
        "sourcedocumentdata_id_fkey",
        "sourcedocumentdata",
        "id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "sourcedocumentmetadata_source_document_id_fkey",
        "sourcedocumentmetadata",
        "source_document_id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "sourcedocumentmetadata_project_metadata_id_fkey",
        "sourcedocumentmetadata",
        "project_metadata_id",
        "projectmetadata",
        "CASCADE",
    ),
    (
        "sourcedocumentstepstatus_sdoc_id_fkey",
        "sourcedocumentstepstatus",
        "sdoc_id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "sourcedocumentdocumenttaglinktable_document_tag_id_fkey",
        "sourcedocumenttaglinktable",
        "tag_id",
        "tag",
        "CASCADE",
    ),
    (
        "sourcedocumentdocumenttaglinktable_source_document_id_fkey",
        "sourcedocumenttaglinktable",
        "source_document_id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "FK_span_annotation_source_annotation_id",
        "spanannotation",
        "source_annotation_id",
        "spanannotation",
        "SET NULL",
    ),
    ("spanannotation_code_id_fkey", "spanannotation", "code_id", "code", "CASCADE"),
    (
        "spanannotation_annotation_document_id_fkey",
        "spanannotation",
        "annotation_document_id",
        "annotationdocument",
        "CASCADE",
    ),
    (
        "FK_span_annotation_source_code_id",
        "spanannotation",
        "source_code_id",
        "code",
        "SET NULL",
    ),
    (
        "spanannotationspangrouplinktable_span_annotation_id_fkey",
        "spanannotationspangrouplinktable",
        "span_annotation_id",
        "spanannotation",
        "CASCADE",
    ),
    (
        "spanannotationspangrouplinktable_span_group_id_fkey",
        "spanannotationspangrouplinktable",
        "span_group_id",
        "spangroup",
        "CASCADE",
    ),
    (
        "spangroup_annotation_document_id_fkey",
        "spangroup",
        "annotation_document_id",
        "annotationdocument",
        "CASCADE",
    ),
    ("documenttag_parent_tag_id_fkey", "tag", "parent_id", "tag", "CASCADE"),
    (
        "documenttagrecommendationlink_source_document_id_fkey",
        "tagrecommendationlink",
        "source_document_id",
        "sourcedocument",
        "CASCADE",
    ),
    (
        "documenttagrecommendationlink_predicted_tag_id_fkey",
        "tagrecommendationlink",
        "predicted_tag_id",
        "tag",
        "CASCADE",
    ),
    (
        "wordfrequency_sdoc_id_fkey",
        "wordfrequency",
        "sdoc_id",
        "sourcedocument",
        "CASCADE",
    ),
]

# (table, column, referenced table): the composite foreign keys
# FK_<table>_<column> onto (project_id, id)
_FOREIGN_KEYS: list[tuple[str, str, str]] = [
    ("annotationdocument", "source_document_id", "sourcedocument"),
    ("aspect", "tag_id", "tag"),
    ("bboxannotation", "annotation_document_id", "annotationdocument"),
    ("bboxannotation", "code_id", "code"),
    ("bboxannotation", "source_annotation_id", "bboxannotation"),
    ("bboxannotation", "source_code_id", "code"),
    ("classifiercodelinktable", "classifier_id", "classifier"),
    ("classifiercodelinktable", "code_id", "code"),
    ("classifierevaluation", "classifier_id", "classifier"),
    ("classifiertaglinktable", "classifier_id", "classifier"),
    ("classifiertaglinktable", "tag_id", "tag"),
    ("cluster", "aspect_id", "aspect"),
    ("cluster", "parent_cluster_id", "cluster"),
    ("code", "parent_id", "code"),
    ("documentaspect", "aspect_id", "aspect"),
    ("documentaspect", "sdoc_id", "sourcedocument"),
    ("documentcluster", "cluster_id", "cluster"),
    ("documentcluster", "sdoc_id", "sourcedocument"),
    ("experimentrun", "experiment_id", "experiment"),
    ("experimentrun", "prompt_version_id", "promptversion"),
    ("folder", "parent_id", "folder"),
    ("memo", "attached_to_id", "objecthandle"),
    ("memofavoritelinktable", "memo_id", "memo"),
    ("memorecent", "memo_id", "memo"),
    ("objecthandle", "bbox_annotation_id", "bboxannotation"),
    ("objecthandle", "code_id", "code"),
    ("objecthandle", "sentence_annotation_id", "sentenceannotation"),
    ("objecthandle", "source_document_id", "sourcedocument"),
    ("objecthandle", "span_annotation_id", "spanannotation"),
    ("objecthandle", "span_group_id", "spangroup"),
    ("objecthandle", "tag_id", "tag"),
    ("promptversion", "prompt_id", "prompt"),
    ("sentenceannotation", "annotation_document_id", "annotationdocument"),
    ("sentenceannotation", "code_id", "code"),
    ("sentenceannotation", "source_annotation_id", "sentenceannotation"),
    ("sentenceannotation", "source_code_id", "code"),
    ("sourcedocument", "folder_id", "folder"),
    ("sourcedocumentdata", "id", "sourcedocument"),
    ("sourcedocumentmetadata", "project_metadata_id", "projectmetadata"),
    ("sourcedocumentmetadata", "source_document_id", "sourcedocument"),
    ("sourcedocumentstepstatus", "sdoc_id", "sourcedocument"),
    ("sourcedocumenttaglinktable", "source_document_id", "sourcedocument"),
    ("sourcedocumenttaglinktable", "tag_id", "tag"),
    ("spanannotation", "annotation_document_id", "annotationdocument"),
    ("spanannotation", "code_id", "code"),
    ("spanannotation", "source_annotation_id", "spanannotation"),
    ("spanannotation", "source_code_id", "code"),
    ("spanannotationspangrouplinktable", "span_annotation_id", "spanannotation"),
    ("spanannotationspangrouplinktable", "span_group_id", "spangroup"),
    ("spangroup", "annotation_document_id", "annotationdocument"),
    ("tag", "parent_id", "tag"),
    ("tagrecommendationlink", "predicted_tag_id", "tag"),
    ("tagrecommendationlink", "source_document_id", "sourcedocument"),
    ("wordfrequency", "sdoc_id", "sourcedocument"),
]

# the optional columns, set to NULL on delete; the other foreign keys cascade
_SET_NULL = {
    ("bboxannotation", "source_annotation_id"),
    ("bboxannotation", "source_code_id"),
    ("cluster", "parent_cluster_id"),
    ("sentenceannotation", "source_annotation_id"),
    ("sentenceannotation", "source_code_id"),
    ("spanannotation", "source_annotation_id"),
    ("spanannotation", "source_code_id"),
}

# (table, old name, new name): constraints named after a former table name
_RENAMED_CONSTRAINTS: list[tuple[str, str, str]] = [
    ("tag", "documenttag_project_id_fkey", "tag_project_id_fkey"),
]

# (old name, new name): sequences named after a former table name
_RENAMED_SEQUENCES: list[tuple[str, str]] = [
    ("documenttag_id_seq", "tag_id_seq"),
    ("documenttagrecommendationlink_id_seq", "tagrecommendationlink_id_seq"),
]

# the columns of the attached object of a handle after this revision
_HANDLE_COLUMNS = [
    "attached_project_id",
    "code_id",
    "source_document_id",
    "span_annotation_id",
    "span_group_id",
    "bbox_annotation_id",
    "sentence_annotation_id",
    "tag_id",
]

# the columns of the attached object of a handle before this revision
_OLD_HANDLE_COLUMNS = [
    "user_id",
    "project_id",
    "code_id",
    "memo_id",
    "source_document_id",
    "span_annotation_id",
    "bbox_annotation_id",
    "sentence_annotation_id",
    "span_group_id",
    "tag_id",
]


def _exactly_one(columns: list[str]) -> str:
    cases = "\n            + ".join(
        f"CASE WHEN {column} IS NULL THEN 0 ELSE 1 END" for column in columns
    )
    return f"(\n            {cases}\n        ) = 1"


def upgrade() -> None:
    # 1. objecthandle: the column of the attached project becomes
    #    attached_project_id; the exactly-one check names it and comes back in 5.
    op.drop_constraint(
        "CC_object_handle_refers_to_exactly_one_instance", "objecthandle", type_="check"
    )
    op.alter_column("objecthandle", "project_id", new_column_name="attached_project_id")
    op.execute(
        "ALTER TABLE objecthandle RENAME CONSTRAINT objecthandle_project_id_fkey "
        "TO objecthandle_attached_project_id_fkey"
    )
    op.execute(
        "ALTER INDEX ix_objecthandle_project_id "
        "RENAME TO ix_objecthandle_attached_project_id"
    )

    # 2. project_id, filled from the parents; NOT NULL fails on a row without one
    for table in _NEW_PROJECT_ID:
        op.add_column(table, sa.Column("project_id", sa.Integer(), nullable=True))
    for table, parent, column in _FILLED:
        op.execute(
            f"UPDATE {table} SET project_id = {parent}.project_id "
            f"FROM {parent} WHERE {parent}.id = {table}.{column}"
        )
    op.execute(
        """
        UPDATE objecthandle h SET project_id = COALESCE(
            h.attached_project_id,
            (SELECT project_id FROM code WHERE id = h.code_id),
            (SELECT project_id FROM tag WHERE id = h.tag_id),
            (SELECT project_id FROM sourcedocument WHERE id = h.source_document_id),
            (SELECT project_id FROM spanannotation WHERE id = h.span_annotation_id),
            (SELECT project_id FROM sentenceannotation WHERE id = h.sentence_annotation_id),
            (SELECT project_id FROM bboxannotation WHERE id = h.bbox_annotation_id),
            (SELECT project_id FROM spangroup WHERE id = h.span_group_id)
        )
        """
    )
    for table in _NEW_PROJECT_ID:
        op.alter_column(table, "project_id", existing_type=sa.Integer(), nullable=False)

    # 3. the foreign keys onto id alone and the handle columns of users and memos
    for name, table, _, _, _ in _OLD_FOREIGN_KEYS:
        op.drop_constraint(name, table, type_="foreignkey")
    op.drop_index("ix_objecthandle_memo_id", table_name="objecthandle")
    op.drop_index("ix_objecthandle_user_id", table_name="objecthandle")
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")
    op.drop_column("objecthandle", "memo_id")
    op.drop_column("objecthandle", "user_id")

    # 4. the primary keys (project_id, id)
    for table in _COVERED_PROJECT_ID_INDEXES:
        op.drop_index(f"ix_{table}_project_id", table_name=table)
    for table, (old_pkey, _) in _OLD_PKEYS.items():
        op.drop_constraint(old_pkey, table, type_="primary")
        op.create_primary_key(f"{table}_pkey", table, ["project_id", "id"])
    for table, (old_pkey, columns) in _OLD_REFERENCE_PKEYS.items():
        op.drop_constraint(old_pkey, table, type_="primary")
        op.create_primary_key(f"{table}_pkey", table, ["project_id", *columns])
    for table, (name, columns) in _OLD_UNIQUE_CONSTRAINTS.items():
        op.drop_constraint(name, table, type_="unique")
        op.create_unique_constraint(name, table, ["project_id", *columns])
    op.create_unique_constraint(
        "UC_annotationdocument_source_document_id_user_id",
        "annotationdocument",
        ["project_id", "source_document_id", "user_id"],
    )
    op.drop_index("ix_annotationdocument_id", table_name="annotationdocument")
    op.create_index(
        "ix_annotationdocument_id", "annotationdocument", ["id"], unique=False
    )

    # 5. the keys and checks of the handles, the foreign keys onto the project
    #    and the composite foreign keys. project_id first: inserting the handle
    #    of an object of another project hits the composite foreign key instead
    #    of the handle of that project
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance",
        "objecthandle",
        ["project_id", *_HANDLE_COLUMNS],
    )
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            "project_id",
            *(sa.literal_column(f"coalesce({c}, 0)") for c in _HANDLE_COLUMNS),
        ],
        unique=True,
    )
    op.create_check_constraint(
        "CC_object_handle_refers_to_exactly_one_instance",
        "objecthandle",
        _exactly_one(_HANDLE_COLUMNS),
    )
    op.create_check_constraint(
        "CC_object_handle_attached_project_is_own_project",
        "objecthandle",
        "attached_project_id IS NULL OR attached_project_id = project_id",
    )
    for table in _NEW_PROJECT_ID:
        op.create_foreign_key(
            f"{table}_project_id_fkey",
            table,
            "project",
            ["project_id"],
            ["id"],
            ondelete="CASCADE",
        )
    for table, column, referent in _FOREIGN_KEYS:
        op.create_foreign_key(
            f"FK_{table}_{column}",
            table,
            referent,
            ["project_id", column],
            ["project_id", "id"],
            ondelete=(
                f"SET NULL ({column})" if (table, column) in _SET_NULL else "CASCADE"
            ),
        )

    # 6. the names after the current table names
    for table, old, new in _RENAMED_CONSTRAINTS:
        op.execute(f"ALTER TABLE {table} RENAME CONSTRAINT {old} TO {new}")
    for old, new in _RENAMED_SEQUENCES:
        op.execute(f"ALTER SEQUENCE {old} RENAME TO {new}")

    # the fill rewrote every row of these tables
    for table in _NEW_PROJECT_ID:
        op.execute(f"ANALYZE {table}")


def downgrade() -> None:
    # 6. the former names
    for table, old, new in _RENAMED_CONSTRAINTS:
        op.execute(f"ALTER TABLE {table} RENAME CONSTRAINT {new} TO {old}")
    for old, new in _RENAMED_SEQUENCES:
        op.execute(f"ALTER SEQUENCE {new} RENAME TO {old}")

    # 5. the composite foreign keys, the foreign keys onto the project, the
    #    keys and checks of the handles
    for table, column, _ in _FOREIGN_KEYS:
        op.drop_constraint(f"FK_{table}_{column}", table, type_="foreignkey")
    for table in _NEW_PROJECT_ID:
        op.drop_constraint(f"{table}_project_id_fkey", table, type_="foreignkey")
    op.drop_constraint(
        "CC_object_handle_attached_project_is_own_project",
        "objecthandle",
        type_="check",
    )
    op.drop_constraint(
        "CC_object_handle_refers_to_exactly_one_instance", "objecthandle", type_="check"
    )
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )

    # 4. the primary keys before
    op.drop_index("ix_annotationdocument_id", table_name="annotationdocument")
    op.create_index(
        "ix_annotationdocument_id", "annotationdocument", ["id"], unique=True
    )
    op.drop_constraint(
        "UC_annotationdocument_source_document_id_user_id",
        "annotationdocument",
        type_="unique",
    )
    for table, (name, columns) in _OLD_UNIQUE_CONSTRAINTS.items():
        op.drop_constraint(name, table, type_="unique")
        op.create_unique_constraint(name, table, columns)
    for table, (old_pkey, columns) in _OLD_REFERENCE_PKEYS.items():
        op.drop_constraint(f"{table}_pkey", table, type_="primary")
        op.create_primary_key(old_pkey, table, columns)
    for table, (old_pkey, old_columns) in _OLD_PKEYS.items():
        op.drop_constraint(f"{table}_pkey", table, type_="primary")
        op.create_primary_key(old_pkey, table, old_columns)
    for table in _COVERED_PROJECT_ID_INDEXES:
        op.create_index(f"ix_{table}_project_id", table, ["project_id"], unique=False)

    # 2. and 1. the new project_id columns; the attached project becomes
    #    project_id again
    for table in _NEW_PROJECT_ID:
        op.drop_column(table, "project_id")
    op.alter_column("objecthandle", "attached_project_id", new_column_name="project_id")
    op.execute(
        "ALTER TABLE objecthandle RENAME CONSTRAINT "
        "objecthandle_attached_project_id_fkey TO objecthandle_project_id_fkey"
    )
    op.execute(
        "ALTER INDEX ix_objecthandle_attached_project_id "
        "RENAME TO ix_objecthandle_project_id"
    )

    # 3. the handle columns of users and memos (empty), their constraints and the
    #    foreign keys onto id alone
    op.add_column(
        "objecthandle",
        sa.Column("user_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "objecthandle",
        sa.Column("memo_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            sa.literal_column(f"COALESCE({c}, 0)")
            for c in [
                "user_id",
                "project_id",
                "code_id",
                "source_document_id",
                "span_annotation_id",
                "bbox_annotation_id",
                "sentence_annotation_id",
                "span_group_id",
                "tag_id",
                "memo_id",
            ]
        ],
        unique=True,
    )
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", _OLD_HANDLE_COLUMNS
    )
    op.create_index("ix_objecthandle_user_id", "objecthandle", ["user_id"])
    op.create_index("ix_objecthandle_memo_id", "objecthandle", ["memo_id"])
    op.create_check_constraint(
        "CC_object_handle_refers_to_exactly_one_instance",
        "objecthandle",
        _exactly_one(_OLD_HANDLE_COLUMNS),
    )
    for name, table, column, referent, ondelete in _OLD_FOREIGN_KEYS:
        op.create_foreign_key(
            name, table, referent, [column], ["id"], ondelete=ondelete
        )
