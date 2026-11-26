"""drop redundant unique project_id id

Every project-owned table has the primary key (project_id, id) now, which makes
UNIQUE (project_id, id) of #927 redundant. The composite foreign keys onto these
tables still use the unique constraints' indexes, so they are dropped and created
again around the constraints (autogenerate does not see which index a foreign key
uses): on upgrade they use the primary keys, on downgrade the unique constraints
again, as the earlier downgrades of #928 expect.

Revision ID: 55d36767e8ab
Revises: ee1ff6d78367
Create Date: 2026-11-26 09:14:03.593366

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "55d36767e8ab"
down_revision: str | None = "ee1ff6d78367"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

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


def _drop_foreign_keys() -> None:
    for table, column, _ in _FOREIGN_KEYS:
        op.drop_constraint(f"FK_{table}_{column}", table, type_="foreignkey")


def _create_foreign_keys() -> None:
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


def upgrade() -> None:
    _drop_foreign_keys()
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(
        op.f("UC_annotationdocument_project_id_id"),
        "annotationdocument",
        type_="unique",
    )
    op.drop_constraint(op.f("UC_aspect_project_id_id"), "aspect", type_="unique")
    op.drop_constraint(
        op.f("UC_bboxannotation_project_id_id"), "bboxannotation", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_classifier_project_id_id"), "classifier", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_classifierevaluation_project_id_id"),
        "classifierevaluation",
        type_="unique",
    )
    op.drop_constraint(op.f("UC_cluster_project_id_id"), "cluster", type_="unique")
    op.drop_constraint(op.f("UC_code_project_id_id"), "code", type_="unique")
    op.drop_constraint(
        op.f("UC_conceptovertimeanalysis_project_id_id"),
        "conceptovertimeanalysis",
        type_="unique",
    )
    op.drop_constraint(
        op.f("UC_experiment_project_id_id"), "experiment", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_experimentrun_project_id_id"), "experimentrun", type_="unique"
    )
    op.drop_constraint(op.f("UC_folder_project_id_id"), "folder", type_="unique")
    op.drop_constraint(op.f("UC_memo_project_id_id"), "memo", type_="unique")
    op.drop_constraint(
        op.f("UC_objecthandle_project_id_id"), "objecthandle", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_projectmetadata_project_id_id"), "projectmetadata", type_="unique"
    )
    op.drop_constraint(op.f("UC_prompt_project_id_id"), "prompt", type_="unique")
    op.drop_constraint(
        op.f("UC_promptversion_project_id_id"), "promptversion", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_searchview_project_id_id"), "searchview", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_sentenceannotation_project_id_id"),
        "sentenceannotation",
        type_="unique",
    )
    op.drop_constraint(
        op.f("UC_sourcedocument_project_id_id"), "sourcedocument", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_sourcedocumentdata_project_id_id"),
        "sourcedocumentdata",
        type_="unique",
    )
    op.drop_constraint(
        op.f("UC_sourcedocumentmetadata_project_id_id"),
        "sourcedocumentmetadata",
        type_="unique",
    )
    op.drop_constraint(
        op.f("UC_spanannotation_project_id_id"), "spanannotation", type_="unique"
    )
    op.drop_constraint(op.f("UC_spangroup_project_id_id"), "spangroup", type_="unique")
    op.drop_constraint(op.f("UC_tag_project_id_id"), "tag", type_="unique")
    op.drop_constraint(
        op.f("UC_tagrecommendationlink_project_id_id"),
        "tagrecommendationlink",
        type_="unique",
    )
    op.drop_constraint(
        op.f("UC_timelineanalysis_project_id_id"), "timelineanalysis", type_="unique"
    )
    op.drop_constraint(
        op.f("UC_whiteboard_project_id_id"), "whiteboard", type_="unique"
    )
    # ### end Alembic commands ###
    _create_foreign_keys()


def downgrade() -> None:
    _drop_foreign_keys()
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_unique_constraint(
        op.f("UC_whiteboard_project_id_id"),
        "whiteboard",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_timelineanalysis_project_id_id"),
        "timelineanalysis",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_tagrecommendationlink_project_id_id"),
        "tagrecommendationlink",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_tag_project_id_id"),
        "tag",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_spangroup_project_id_id"),
        "spangroup",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_spanannotation_project_id_id"),
        "spanannotation",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_sourcedocumentmetadata_project_id_id"),
        "sourcedocumentmetadata",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_sourcedocumentdata_project_id_id"),
        "sourcedocumentdata",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_sourcedocument_project_id_id"),
        "sourcedocument",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_sentenceannotation_project_id_id"),
        "sentenceannotation",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_searchview_project_id_id"),
        "searchview",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_promptversion_project_id_id"),
        "promptversion",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_prompt_project_id_id"),
        "prompt",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_projectmetadata_project_id_id"),
        "projectmetadata",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_objecthandle_project_id_id"),
        "objecthandle",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_memo_project_id_id"),
        "memo",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_folder_project_id_id"),
        "folder",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_experimentrun_project_id_id"),
        "experimentrun",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_experiment_project_id_id"),
        "experiment",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_conceptovertimeanalysis_project_id_id"),
        "conceptovertimeanalysis",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_code_project_id_id"),
        "code",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_cluster_project_id_id"),
        "cluster",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_classifierevaluation_project_id_id"),
        "classifierevaluation",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_classifier_project_id_id"),
        "classifier",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_bboxannotation_project_id_id"),
        "bboxannotation",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_aspect_project_id_id"),
        "aspect",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    op.create_unique_constraint(
        op.f("UC_annotationdocument_project_id_id"),
        "annotationdocument",
        ["project_id", "id"],
        postgresql_nulls_not_distinct=False,
    )
    # ### end Alembic commands ###
    # Postgres picks the primary key for a new foreign key while it exists, but
    # the earlier downgrades drop the primary keys: the foreign keys are created
    # while the primary keys are dropped, so they use the unique constraints
    referents = sorted({referent for _, _, referent in _FOREIGN_KEYS})
    for table in referents:
        op.drop_constraint(f"{table}_pkey", table, type_="primary")
    _create_foreign_keys()
    for table in referents:
        op.create_primary_key(f"{table}_pkey", table, ["project_id", "id"])
