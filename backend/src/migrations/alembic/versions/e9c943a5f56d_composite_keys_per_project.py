"""composite keys per project

Revision ID: e9c943a5f56d
Revises: 807bab97f373
Create Date: 2026-11-25 10:58:24.262935

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e9c943a5f56d"
down_revision: str | None = "807bab97f373"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. objecthandle: the column of the attached project becomes attached_project_id,
    #    project_id becomes the project the handle belongs to. The exactly-one check
    #    names user_id and memo_id, which are dropped below.
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
    op.add_column("objecthandle", sa.Column("project_id", sa.Integer(), nullable=True))

    # 2. the new project_id columns, filled from their parents
    op.add_column(
        "annotationdocument", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "classifiercodelinktable", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "classifierevaluation", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "classifiertaglinktable", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column("cluster", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column(
        "documentaspect", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "documentcluster", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column("experimentrun", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column(
        "memofavoritelinktable", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column("memorecent", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column("promptversion", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column(
        "sourcedocumentdata", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "sourcedocumentmetadata", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "sourcedocumentstepstatus", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "sourcedocumenttaglinktable",
        sa.Column("project_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "spanannotationspangrouplinktable",
        sa.Column("project_id", sa.Integer(), nullable=True),
    )
    op.add_column("spangroup", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column(
        "tagrecommendationlink", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column("wordfrequency", sa.Column("project_id", sa.Integer(), nullable=True))
    for table, parent, column in (
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
    ):
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
    for table in (
        "annotationdocument",
        "sourcedocumentdata",
        "sourcedocumentmetadata",
        "sourcedocumenttaglinktable",
        "sourcedocumentstepstatus",
        "wordfrequency",
        "tagrecommendationlink",
        "documentaspect",
        "documentcluster",
        "spangroup",
        "spanannotationspangrouplinktable",
        "memofavoritelinktable",
        "memorecent",
        "promptversion",
        "classifiercodelinktable",
        "classifiertaglinktable",
        "classifierevaluation",
        "experimentrun",
        "cluster",
        "objecthandle",
    ):
        op.alter_column(table, "project_id", existing_type=sa.Integer(), nullable=False)

    # 3. drop the foreign keys onto id alone and the handle columns of users and memos
    op.drop_constraint(
        op.f("annotationdocument_source_document_id_fkey"),
        "annotationdocument",
        type_="foreignkey",
    )
    op.drop_constraint(op.f("aspect_tag_id_fkey"), "aspect", type_="foreignkey")
    op.drop_constraint(
        op.f("FK_bbox_annotation_source_annotation_id"),
        "bboxannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("bboxannotation_annotation_document_id_fkey"),
        "bboxannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("FK_bbox_annotation_source_code_id"), "bboxannotation", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("bboxannotation_code_id_fkey"), "bboxannotation", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("classifiercodelinktable_classifier_id_fkey"),
        "classifiercodelinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("classifiercodelinktable_code_id_fkey"),
        "classifiercodelinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("classifierevaluation_classifier_id_fkey"),
        "classifierevaluation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("classifiertaglinktable_tag_id_fkey"),
        "classifiertaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("classifiertaglinktable_classifier_id_fkey"),
        "classifiertaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("cluster_parent_cluster_id_fkey"), "cluster", type_="foreignkey"
    )
    op.drop_constraint(op.f("cluster_aspect_id_fkey"), "cluster", type_="foreignkey")
    op.drop_constraint(op.f("code_parent_code_id_fkey"), "code", type_="foreignkey")
    op.drop_constraint(
        op.f("documentaspect_aspect_id_fkey"), "documentaspect", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("documentaspect_sdoc_id_fkey"), "documentaspect", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("documentcluster_sdoc_id_fkey"), "documentcluster", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("documentcluster_cluster_id_fkey"), "documentcluster", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("experimentrun_experiment_id_fkey"), "experimentrun", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("experimentrun_prompt_version_id_fkey"),
        "experimentrun",
        type_="foreignkey",
    )
    op.drop_constraint(op.f("folder_parent_id_fkey"), "folder", type_="foreignkey")
    op.drop_constraint(op.f("memo_attached_to_id_fkey"), "memo", type_="foreignkey")
    op.drop_constraint(
        op.f("memofavoritelinktable_memo_id_fkey"),
        "memofavoritelinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("memorecent_memo_id_fkey"), "memorecent", type_="foreignkey"
    )
    op.drop_index(op.f("ix_objecthandle_memo_id"), table_name="objecthandle")
    op.drop_index(op.f("ix_objecthandle_user_id"), table_name="objecthandle")
    op.drop_constraint(
        op.f("UC_only_one_object_handle_per_instance"), "objecthandle", type_="unique"
    )
    op.drop_index(op.f("idx_for_uc_work_with_null"), table_name="objecthandle")
    op.drop_constraint(
        op.f("objecthandle_span_group_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_memo_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_source_document_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_code_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_span_annotation_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_user_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_tag_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("objecthandle_sentence_annotation_id_fkey"),
        "objecthandle",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("objecthandle_bbox_annotation_id_fkey"), "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("promptversion_prompt_id_fkey"), "promptversion", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("sentenceannotation_code_id_fkey"),
        "sentenceannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("FK_sentence_annotation_source_code_id"),
        "sentenceannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("sentenceannotation_annotation_document_id_fkey"),
        "sentenceannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("FK_sentence_annotation_source_annotation_id"),
        "sentenceannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("fk_sourcedocument_folder_id"), "sourcedocument", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("sourcedocumentdata_id_fkey"), "sourcedocumentdata", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("sourcedocumentmetadata_source_document_id_fkey"),
        "sourcedocumentmetadata",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("sourcedocumentmetadata_project_metadata_id_fkey"),
        "sourcedocumentmetadata",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("sourcedocumentstepstatus_sdoc_id_fkey"),
        "sourcedocumentstepstatus",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("sourcedocumentdocumenttaglinktable_document_tag_id_fkey"),
        "sourcedocumenttaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("sourcedocumentdocumenttaglinktable_source_document_id_fkey"),
        "sourcedocumenttaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("FK_span_annotation_source_annotation_id"),
        "spanannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("spanannotation_code_id_fkey"), "spanannotation", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("spanannotation_annotation_document_id_fkey"),
        "spanannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("FK_span_annotation_source_code_id"), "spanannotation", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("spanannotationspangrouplinktable_span_annotation_id_fkey"),
        "spanannotationspangrouplinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("spanannotationspangrouplinktable_span_group_id_fkey"),
        "spanannotationspangrouplinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("spangroup_annotation_document_id_fkey"), "spangroup", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("documenttag_parent_tag_id_fkey"), "tag", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("documenttagrecommendationlink_source_document_id_fkey"),
        "tagrecommendationlink",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("documenttagrecommendationlink_predicted_tag_id_fkey"),
        "tagrecommendationlink",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("wordfrequency_sdoc_id_fkey"), "wordfrequency", type_="foreignkey"
    )
    op.drop_column("objecthandle", "memo_id")
    op.drop_column("objecthandle", "user_id")

    # 4. UNIQUE (project_id, id), the new indexes and checks
    op.create_unique_constraint(
        "UC_annotationdocument_project_id_id",
        "annotationdocument",
        ["project_id", "id"],
    )
    op.create_index(
        op.f("ix_annotationdocument_project_id"),
        "annotationdocument",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_aspect_project_id_id", "aspect", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_bboxannotation_project_id_id", "bboxannotation", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_classifier_project_id_id", "classifier", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_classifiercodelinktable_project_id"),
        "classifiercodelinktable",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_classifierevaluation_project_id_id",
        "classifierevaluation",
        ["project_id", "id"],
    )
    op.create_index(
        op.f("ix_classifierevaluation_project_id"),
        "classifierevaluation",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_classifiertaglinktable_project_id"),
        "classifiertaglinktable",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_cluster_project_id_id", "cluster", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_cluster_project_id"), "cluster", ["project_id"], unique=False
    )
    op.create_unique_constraint("UC_code_project_id_id", "code", ["project_id", "id"])
    op.create_unique_constraint(
        "UC_conceptovertimeanalysis_project_id_id",
        "conceptovertimeanalysis",
        ["project_id", "id"],
    )
    op.create_index(
        op.f("ix_documentaspect_project_id"),
        "documentaspect",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_documentcluster_project_id"),
        "documentcluster",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_experiment_project_id_id", "experiment", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_experimentrun_project_id_id", "experimentrun", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_experimentrun_project_id"),
        "experimentrun",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_folder_project_id_id", "folder", ["project_id", "id"]
    )
    op.create_unique_constraint("UC_memo_project_id_id", "memo", ["project_id", "id"])
    op.create_index(
        op.f("ix_memofavoritelinktable_project_id"),
        "memofavoritelinktable",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_memorecent_project_id"), "memorecent", ["project_id"], unique=False
    )
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance",
        "objecthandle",
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
    )
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            sa.literal_column("coalesce(attached_project_id, 0)"),
            sa.literal_column("coalesce(code_id, 0)"),
            sa.literal_column("coalesce(source_document_id, 0)"),
            sa.literal_column("coalesce(span_annotation_id, 0)"),
            sa.literal_column("coalesce(span_group_id, 0)"),
            sa.literal_column("coalesce(bbox_annotation_id, 0)"),
            sa.literal_column("coalesce(sentence_annotation_id, 0)"),
            sa.literal_column("coalesce(tag_id, 0)"),
        ],
        unique=True,
    )
    op.create_unique_constraint(
        "UC_objecthandle_project_id_id", "objecthandle", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_projectmetadata_project_id_id", "projectmetadata", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_prompt_project_id_id", "prompt", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_promptversion_project_id_id", "promptversion", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_promptversion_project_id"),
        "promptversion",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_searchview_project_id_id", "searchview", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_sentenceannotation_project_id_id",
        "sentenceannotation",
        ["project_id", "id"],
    )
    op.create_unique_constraint(
        "UC_sourcedocument_project_id_id", "sourcedocument", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_sourcedocumentdata_project_id_id",
        "sourcedocumentdata",
        ["project_id", "id"],
    )
    op.create_index(
        op.f("ix_sourcedocumentdata_project_id"),
        "sourcedocumentdata",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_sourcedocumentmetadata_project_id_id",
        "sourcedocumentmetadata",
        ["project_id", "id"],
    )
    op.create_index(
        op.f("ix_sourcedocumentmetadata_project_id"),
        "sourcedocumentmetadata",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sourcedocumentstepstatus_project_id"),
        "sourcedocumentstepstatus",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sourcedocumenttaglinktable_project_id"),
        "sourcedocumenttaglinktable",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_spanannotation_project_id_id", "spanannotation", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_spanannotationspangrouplinktable_project_id"),
        "spanannotationspangrouplinktable",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_spangroup_project_id_id", "spangroup", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_spangroup_project_id"), "spangroup", ["project_id"], unique=False
    )
    op.create_unique_constraint("UC_tag_project_id_id", "tag", ["project_id", "id"])
    op.create_unique_constraint(
        "UC_tagrecommendationlink_project_id_id",
        "tagrecommendationlink",
        ["project_id", "id"],
    )
    op.create_index(
        op.f("ix_tagrecommendationlink_project_id"),
        "tagrecommendationlink",
        ["project_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "UC_timelineanalysis_project_id_id", "timelineanalysis", ["project_id", "id"]
    )
    op.create_unique_constraint(
        "UC_whiteboard_project_id_id", "whiteboard", ["project_id", "id"]
    )
    op.create_index(
        op.f("ix_wordfrequency_project_id"),
        "wordfrequency",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_objecthandle_project_id"), "objecthandle", ["project_id"], unique=False
    )
    op.create_check_constraint(
        "CC_object_handle_refers_to_exactly_one_instance",
        "objecthandle",
        """(
            CASE WHEN attached_project_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN span_group_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN bbox_annotation_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN sentence_annotation_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN tag_id IS NULL THEN 0 ELSE 1 END
        ) = 1""",
    )
    op.create_check_constraint(
        "CC_object_handle_attached_project_is_own_project",
        "objecthandle",
        "attached_project_id IS NULL OR attached_project_id = project_id",
    )

    # 5. the foreign keys onto the project and the composite foreign keys
    op.create_foreign_key(
        "objecthandle_project_id_fkey",
        "objecthandle",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_annotationdocument_source_document_id",
        "annotationdocument",
        "sourcedocument",
        ["project_id", "source_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "annotationdocument_project_id_fkey",
        "annotationdocument",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_aspect_tag_id",
        "aspect",
        "tag",
        ["project_id", "tag_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_bboxannotation_source_code_id",
        "bboxannotation",
        "code",
        ["project_id", "source_code_id"],
        ["project_id", "id"],
        ondelete="SET NULL (source_code_id)",
    )
    op.create_foreign_key(
        "FK_bboxannotation_annotation_document_id",
        "bboxannotation",
        "annotationdocument",
        ["project_id", "annotation_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_bboxannotation_code_id",
        "bboxannotation",
        "code",
        ["project_id", "code_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_bboxannotation_source_annotation_id",
        "bboxannotation",
        "bboxannotation",
        ["project_id", "source_annotation_id"],
        ["project_id", "id"],
        ondelete="SET NULL (source_annotation_id)",
    )
    op.create_foreign_key(
        "FK_classifiercodelinktable_classifier_id",
        "classifiercodelinktable",
        "classifier",
        ["project_id", "classifier_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_classifiercodelinktable_code_id",
        "classifiercodelinktable",
        "code",
        ["project_id", "code_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "classifiercodelinktable_project_id_fkey",
        "classifiercodelinktable",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_classifierevaluation_classifier_id",
        "classifierevaluation",
        "classifier",
        ["project_id", "classifier_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "classifierevaluation_project_id_fkey",
        "classifierevaluation",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_classifiertaglinktable_tag_id",
        "classifiertaglinktable",
        "tag",
        ["project_id", "tag_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "classifiertaglinktable_project_id_fkey",
        "classifiertaglinktable",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_classifiertaglinktable_classifier_id",
        "classifiertaglinktable",
        "classifier",
        ["project_id", "classifier_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_cluster_parent_cluster_id",
        "cluster",
        "cluster",
        ["project_id", "parent_cluster_id"],
        ["project_id", "id"],
        ondelete="SET NULL (parent_cluster_id)",
    )
    op.create_foreign_key(
        "FK_cluster_aspect_id",
        "cluster",
        "aspect",
        ["project_id", "aspect_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "cluster_project_id_fkey",
        "cluster",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_code_parent_id",
        "code",
        "code",
        ["project_id", "parent_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_documentaspect_aspect_id",
        "documentaspect",
        "aspect",
        ["project_id", "aspect_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_documentaspect_sdoc_id",
        "documentaspect",
        "sourcedocument",
        ["project_id", "sdoc_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "documentaspect_project_id_fkey",
        "documentaspect",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_documentcluster_sdoc_id",
        "documentcluster",
        "sourcedocument",
        ["project_id", "sdoc_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "documentcluster_project_id_fkey",
        "documentcluster",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_documentcluster_cluster_id",
        "documentcluster",
        "cluster",
        ["project_id", "cluster_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "experimentrun_project_id_fkey",
        "experimentrun",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_experimentrun_prompt_version_id",
        "experimentrun",
        "promptversion",
        ["project_id", "prompt_version_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_experimentrun_experiment_id",
        "experimentrun",
        "experiment",
        ["project_id", "experiment_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_folder_parent_id",
        "folder",
        "folder",
        ["project_id", "parent_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_memo_attached_to_id",
        "memo",
        "objecthandle",
        ["project_id", "attached_to_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "memofavoritelinktable_project_id_fkey",
        "memofavoritelinktable",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_memofavoritelinktable_memo_id",
        "memofavoritelinktable",
        "memo",
        ["project_id", "memo_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_memorecent_memo_id",
        "memorecent",
        "memo",
        ["project_id", "memo_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "memorecent_project_id_fkey",
        "memorecent",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_span_annotation_id",
        "objecthandle",
        "spanannotation",
        ["project_id", "span_annotation_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_code_id",
        "objecthandle",
        "code",
        ["project_id", "code_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_tag_id",
        "objecthandle",
        "tag",
        ["project_id", "tag_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_bbox_annotation_id",
        "objecthandle",
        "bboxannotation",
        ["project_id", "bbox_annotation_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_span_group_id",
        "objecthandle",
        "spangroup",
        ["project_id", "span_group_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_sentence_annotation_id",
        "objecthandle",
        "sentenceannotation",
        ["project_id", "sentence_annotation_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_objecthandle_source_document_id",
        "objecthandle",
        "sourcedocument",
        ["project_id", "source_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "promptversion_project_id_fkey",
        "promptversion",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_promptversion_prompt_id",
        "promptversion",
        "prompt",
        ["project_id", "prompt_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sentenceannotation_annotation_document_id",
        "sentenceannotation",
        "annotationdocument",
        ["project_id", "annotation_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sentenceannotation_source_annotation_id",
        "sentenceannotation",
        "sentenceannotation",
        ["project_id", "source_annotation_id"],
        ["project_id", "id"],
        ondelete="SET NULL (source_annotation_id)",
    )
    op.create_foreign_key(
        "FK_sentenceannotation_code_id",
        "sentenceannotation",
        "code",
        ["project_id", "code_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sentenceannotation_source_code_id",
        "sentenceannotation",
        "code",
        ["project_id", "source_code_id"],
        ["project_id", "id"],
        ondelete="SET NULL (source_code_id)",
    )
    op.create_foreign_key(
        "FK_sourcedocument_folder_id",
        "sourcedocument",
        "folder",
        ["project_id", "folder_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "sourcedocumentdata_project_id_fkey",
        "sourcedocumentdata",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sourcedocumentdata_id",
        "sourcedocumentdata",
        "sourcedocument",
        ["project_id", "id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sourcedocumentmetadata_project_metadata_id",
        "sourcedocumentmetadata",
        "projectmetadata",
        ["project_id", "project_metadata_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "sourcedocumentmetadata_project_id_fkey",
        "sourcedocumentmetadata",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sourcedocumentmetadata_source_document_id",
        "sourcedocumentmetadata",
        "sourcedocument",
        ["project_id", "source_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sourcedocumentstepstatus_sdoc_id",
        "sourcedocumentstepstatus",
        "sourcedocument",
        ["project_id", "sdoc_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "sourcedocumentstepstatus_project_id_fkey",
        "sourcedocumentstepstatus",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "sourcedocumenttaglinktable_project_id_fkey",
        "sourcedocumenttaglinktable",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sourcedocumenttaglinktable_source_document_id",
        "sourcedocumenttaglinktable",
        "sourcedocument",
        ["project_id", "source_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_sourcedocumenttaglinktable_tag_id",
        "sourcedocumenttaglinktable",
        "tag",
        ["project_id", "tag_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_spanannotation_source_code_id",
        "spanannotation",
        "code",
        ["project_id", "source_code_id"],
        ["project_id", "id"],
        ondelete="SET NULL (source_code_id)",
    )
    op.create_foreign_key(
        "FK_spanannotation_source_annotation_id",
        "spanannotation",
        "spanannotation",
        ["project_id", "source_annotation_id"],
        ["project_id", "id"],
        ondelete="SET NULL (source_annotation_id)",
    )
    op.create_foreign_key(
        "FK_spanannotation_annotation_document_id",
        "spanannotation",
        "annotationdocument",
        ["project_id", "annotation_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_spanannotation_code_id",
        "spanannotation",
        "code",
        ["project_id", "code_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_spanannotationspangrouplinktable_span_annotation_id",
        "spanannotationspangrouplinktable",
        "spanannotation",
        ["project_id", "span_annotation_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_spanannotationspangrouplinktable_span_group_id",
        "spanannotationspangrouplinktable",
        "spangroup",
        ["project_id", "span_group_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "spanannotationspangrouplinktable_project_id_fkey",
        "spanannotationspangrouplinktable",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "spangroup_project_id_fkey",
        "spangroup",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_spangroup_annotation_document_id",
        "spangroup",
        "annotationdocument",
        ["project_id", "annotation_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_tag_parent_id",
        "tag",
        "tag",
        ["project_id", "parent_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_tagrecommendationlink_source_document_id",
        "tagrecommendationlink",
        "sourcedocument",
        ["project_id", "source_document_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_tagrecommendationlink_predicted_tag_id",
        "tagrecommendationlink",
        "tag",
        ["project_id", "predicted_tag_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "tagrecommendationlink_project_id_fkey",
        "tagrecommendationlink",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "wordfrequency_project_id_fkey",
        "wordfrequency",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "FK_wordfrequency_sdoc_id",
        "wordfrequency",
        "sourcedocument",
        ["project_id", "sdoc_id"],
        ["project_id", "id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # 1. the new foreign keys and checks
    op.drop_constraint(
        "CC_object_handle_attached_project_is_own_project",
        "objecthandle",
        type_="check",
    )
    op.drop_constraint(
        "CC_object_handle_refers_to_exactly_one_instance", "objecthandle", type_="check"
    )
    op.drop_constraint(
        "objecthandle_project_id_fkey", "objecthandle", type_="foreignkey"
    )
    op.drop_constraint("FK_wordfrequency_sdoc_id", "wordfrequency", type_="foreignkey")
    op.drop_constraint(
        "wordfrequency_project_id_fkey", "wordfrequency", type_="foreignkey"
    )
    op.drop_constraint(
        "tagrecommendationlink_project_id_fkey",
        "tagrecommendationlink",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_tagrecommendationlink_predicted_tag_id",
        "tagrecommendationlink",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_tagrecommendationlink_source_document_id",
        "tagrecommendationlink",
        type_="foreignkey",
    )
    op.drop_constraint("FK_tag_parent_id", "tag", type_="foreignkey")
    op.drop_constraint(
        "FK_spangroup_annotation_document_id", "spangroup", type_="foreignkey"
    )
    op.drop_constraint("spangroup_project_id_fkey", "spangroup", type_="foreignkey")
    op.drop_constraint(
        "spanannotationspangrouplinktable_project_id_fkey",
        "spanannotationspangrouplinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_spanannotationspangrouplinktable_span_group_id",
        "spanannotationspangrouplinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_spanannotationspangrouplinktable_span_annotation_id",
        "spanannotationspangrouplinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_spanannotation_code_id", "spanannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_spanannotation_annotation_document_id", "spanannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_spanannotation_source_annotation_id", "spanannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_spanannotation_source_code_id", "spanannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_sourcedocumenttaglinktable_tag_id",
        "sourcedocumenttaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_sourcedocumenttaglinktable_source_document_id",
        "sourcedocumenttaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "sourcedocumenttaglinktable_project_id_fkey",
        "sourcedocumenttaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "sourcedocumentstepstatus_project_id_fkey",
        "sourcedocumentstepstatus",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_sourcedocumentstepstatus_sdoc_id",
        "sourcedocumentstepstatus",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_sourcedocumentmetadata_source_document_id",
        "sourcedocumentmetadata",
        type_="foreignkey",
    )
    op.drop_constraint(
        "sourcedocumentmetadata_project_id_fkey",
        "sourcedocumentmetadata",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_sourcedocumentmetadata_project_metadata_id",
        "sourcedocumentmetadata",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_sourcedocumentdata_id", "sourcedocumentdata", type_="foreignkey"
    )
    op.drop_constraint(
        "sourcedocumentdata_project_id_fkey", "sourcedocumentdata", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_sourcedocument_folder_id", "sourcedocument", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_sentenceannotation_source_code_id", "sentenceannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_sentenceannotation_code_id", "sentenceannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_sentenceannotation_source_annotation_id",
        "sentenceannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_sentenceannotation_annotation_document_id",
        "sentenceannotation",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_promptversion_prompt_id", "promptversion", type_="foreignkey"
    )
    op.drop_constraint(
        "promptversion_project_id_fkey", "promptversion", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_objecthandle_source_document_id", "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_objecthandle_sentence_annotation_id", "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_objecthandle_span_group_id", "objecthandle", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_objecthandle_bbox_annotation_id", "objecthandle", type_="foreignkey"
    )
    op.drop_constraint("FK_objecthandle_tag_id", "objecthandle", type_="foreignkey")
    op.drop_constraint("FK_objecthandle_code_id", "objecthandle", type_="foreignkey")
    op.drop_constraint(
        "FK_objecthandle_span_annotation_id", "objecthandle", type_="foreignkey"
    )
    op.drop_constraint("memorecent_project_id_fkey", "memorecent", type_="foreignkey")
    op.drop_constraint("FK_memorecent_memo_id", "memorecent", type_="foreignkey")
    op.drop_constraint(
        "FK_memofavoritelinktable_memo_id", "memofavoritelinktable", type_="foreignkey"
    )
    op.drop_constraint(
        "memofavoritelinktable_project_id_fkey",
        "memofavoritelinktable",
        type_="foreignkey",
    )
    op.drop_constraint("FK_memo_attached_to_id", "memo", type_="foreignkey")
    op.drop_constraint("FK_folder_parent_id", "folder", type_="foreignkey")
    op.drop_constraint(
        "FK_experimentrun_experiment_id", "experimentrun", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_experimentrun_prompt_version_id", "experimentrun", type_="foreignkey"
    )
    op.drop_constraint(
        "experimentrun_project_id_fkey", "experimentrun", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_documentcluster_cluster_id", "documentcluster", type_="foreignkey"
    )
    op.drop_constraint(
        "documentcluster_project_id_fkey", "documentcluster", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_documentcluster_sdoc_id", "documentcluster", type_="foreignkey"
    )
    op.drop_constraint(
        "documentaspect_project_id_fkey", "documentaspect", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_documentaspect_sdoc_id", "documentaspect", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_documentaspect_aspect_id", "documentaspect", type_="foreignkey"
    )
    op.drop_constraint("FK_code_parent_id", "code", type_="foreignkey")
    op.drop_constraint("cluster_project_id_fkey", "cluster", type_="foreignkey")
    op.drop_constraint("FK_cluster_aspect_id", "cluster", type_="foreignkey")
    op.drop_constraint("FK_cluster_parent_cluster_id", "cluster", type_="foreignkey")
    op.drop_constraint(
        "FK_classifiertaglinktable_classifier_id",
        "classifiertaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "classifiertaglinktable_project_id_fkey",
        "classifiertaglinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_classifiertaglinktable_tag_id", "classifiertaglinktable", type_="foreignkey"
    )
    op.drop_constraint(
        "classifierevaluation_project_id_fkey",
        "classifierevaluation",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_classifierevaluation_classifier_id",
        "classifierevaluation",
        type_="foreignkey",
    )
    op.drop_constraint(
        "classifiercodelinktable_project_id_fkey",
        "classifiercodelinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_classifiercodelinktable_code_id",
        "classifiercodelinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_classifiercodelinktable_classifier_id",
        "classifiercodelinktable",
        type_="foreignkey",
    )
    op.drop_constraint(
        "FK_bboxannotation_source_annotation_id", "bboxannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_bboxannotation_code_id", "bboxannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_bboxannotation_annotation_document_id", "bboxannotation", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_bboxannotation_source_code_id", "bboxannotation", type_="foreignkey"
    )
    op.drop_constraint("FK_aspect_tag_id", "aspect", type_="foreignkey")
    op.drop_constraint(
        "annotationdocument_project_id_fkey", "annotationdocument", type_="foreignkey"
    )
    op.drop_constraint(
        "FK_annotationdocument_source_document_id",
        "annotationdocument",
        type_="foreignkey",
    )

    # 2. the new unique constraints, indexes and project_id columns
    op.drop_index(op.f("ix_objecthandle_project_id"), table_name="objecthandle")
    op.drop_index(op.f("ix_wordfrequency_project_id"), table_name="wordfrequency")
    op.drop_constraint("UC_whiteboard_project_id_id", "whiteboard", type_="unique")
    op.drop_constraint(
        "UC_timelineanalysis_project_id_id", "timelineanalysis", type_="unique"
    )
    op.drop_index(
        op.f("ix_tagrecommendationlink_project_id"), table_name="tagrecommendationlink"
    )
    op.drop_constraint(
        "UC_tagrecommendationlink_project_id_id",
        "tagrecommendationlink",
        type_="unique",
    )
    op.drop_constraint("UC_tag_project_id_id", "tag", type_="unique")
    op.drop_index(op.f("ix_spangroup_project_id"), table_name="spangroup")
    op.drop_constraint("UC_spangroup_project_id_id", "spangroup", type_="unique")
    op.drop_index(
        op.f("ix_spanannotationspangrouplinktable_project_id"),
        table_name="spanannotationspangrouplinktable",
    )
    op.drop_constraint(
        "UC_spanannotation_project_id_id", "spanannotation", type_="unique"
    )
    op.drop_index(
        op.f("ix_sourcedocumenttaglinktable_project_id"),
        table_name="sourcedocumenttaglinktable",
    )
    op.drop_index(
        op.f("ix_sourcedocumentstepstatus_project_id"),
        table_name="sourcedocumentstepstatus",
    )
    op.drop_index(
        op.f("ix_sourcedocumentmetadata_project_id"),
        table_name="sourcedocumentmetadata",
    )
    op.drop_constraint(
        "UC_sourcedocumentmetadata_project_id_id",
        "sourcedocumentmetadata",
        type_="unique",
    )
    op.drop_index(
        op.f("ix_sourcedocumentdata_project_id"), table_name="sourcedocumentdata"
    )
    op.drop_constraint(
        "UC_sourcedocumentdata_project_id_id", "sourcedocumentdata", type_="unique"
    )
    op.drop_constraint(
        "UC_sourcedocument_project_id_id", "sourcedocument", type_="unique"
    )
    op.drop_constraint(
        "UC_sentenceannotation_project_id_id", "sentenceannotation", type_="unique"
    )
    op.drop_constraint("UC_searchview_project_id_id", "searchview", type_="unique")
    op.drop_index(op.f("ix_promptversion_project_id"), table_name="promptversion")
    op.drop_constraint(
        "UC_promptversion_project_id_id", "promptversion", type_="unique"
    )
    op.drop_constraint("UC_prompt_project_id_id", "prompt", type_="unique")
    op.drop_constraint(
        "UC_projectmetadata_project_id_id", "projectmetadata", type_="unique"
    )
    op.drop_constraint("UC_objecthandle_project_id_id", "objecthandle", type_="unique")
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )
    op.drop_index(op.f("ix_memorecent_project_id"), table_name="memorecent")
    op.drop_index(
        op.f("ix_memofavoritelinktable_project_id"), table_name="memofavoritelinktable"
    )
    op.drop_constraint("UC_memo_project_id_id", "memo", type_="unique")
    op.drop_constraint("UC_folder_project_id_id", "folder", type_="unique")
    op.drop_index(op.f("ix_experimentrun_project_id"), table_name="experimentrun")
    op.drop_constraint(
        "UC_experimentrun_project_id_id", "experimentrun", type_="unique"
    )
    op.drop_constraint("UC_experiment_project_id_id", "experiment", type_="unique")
    op.drop_index(op.f("ix_documentcluster_project_id"), table_name="documentcluster")
    op.drop_index(op.f("ix_documentaspect_project_id"), table_name="documentaspect")
    op.drop_constraint(
        "UC_conceptovertimeanalysis_project_id_id",
        "conceptovertimeanalysis",
        type_="unique",
    )
    op.drop_constraint("UC_code_project_id_id", "code", type_="unique")
    op.drop_index(op.f("ix_cluster_project_id"), table_name="cluster")
    op.drop_constraint("UC_cluster_project_id_id", "cluster", type_="unique")
    op.drop_index(
        op.f("ix_classifiertaglinktable_project_id"),
        table_name="classifiertaglinktable",
    )
    op.drop_index(
        op.f("ix_classifierevaluation_project_id"), table_name="classifierevaluation"
    )
    op.drop_constraint(
        "UC_classifierevaluation_project_id_id", "classifierevaluation", type_="unique"
    )
    op.drop_index(
        op.f("ix_classifiercodelinktable_project_id"),
        table_name="classifiercodelinktable",
    )
    op.drop_constraint("UC_classifier_project_id_id", "classifier", type_="unique")
    op.drop_constraint(
        "UC_bboxannotation_project_id_id", "bboxannotation", type_="unique"
    )
    op.drop_constraint("UC_aspect_project_id_id", "aspect", type_="unique")
    op.drop_index(
        op.f("ix_annotationdocument_project_id"), table_name="annotationdocument"
    )
    op.drop_constraint(
        "UC_annotationdocument_project_id_id", "annotationdocument", type_="unique"
    )
    op.drop_column("wordfrequency", "project_id")
    op.drop_column("tagrecommendationlink", "project_id")
    op.drop_column("spangroup", "project_id")
    op.drop_column("spanannotationspangrouplinktable", "project_id")
    op.drop_column("sourcedocumenttaglinktable", "project_id")
    op.drop_column("sourcedocumentstepstatus", "project_id")
    op.drop_column("sourcedocumentmetadata", "project_id")
    op.drop_column("sourcedocumentdata", "project_id")
    op.drop_column("promptversion", "project_id")
    op.drop_column("memorecent", "project_id")
    op.drop_column("memofavoritelinktable", "project_id")
    op.drop_column("experimentrun", "project_id")
    op.drop_column("documentcluster", "project_id")
    op.drop_column("documentaspect", "project_id")
    op.drop_column("cluster", "project_id")
    op.drop_column("classifiertaglinktable", "project_id")
    op.drop_column("classifierevaluation", "project_id")
    op.drop_column("classifiercodelinktable", "project_id")
    op.drop_column("annotationdocument", "project_id")
    op.drop_column("objecthandle", "project_id")
    op.alter_column("objecthandle", "attached_project_id", new_column_name="project_id")
    op.execute(
        "ALTER TABLE objecthandle RENAME CONSTRAINT "
        "objecthandle_attached_project_id_fkey TO objecthandle_project_id_fkey"
    )
    op.execute(
        "ALTER INDEX ix_objecthandle_attached_project_id "
        "RENAME TO ix_objecthandle_project_id"
    )

    # 3. the old handle columns (empty), constraints and foreign keys onto id alone
    op.add_column(
        "objecthandle",
        sa.Column("user_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "objecthandle",
        sa.Column("memo_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.create_index(
        op.f("idx_for_uc_work_with_null"),
        "objecthandle",
        [
            sa.literal_column("COALESCE(user_id, 0)"),
            sa.literal_column("COALESCE(project_id, 0)"),
            sa.literal_column("COALESCE(code_id, 0)"),
            sa.literal_column("COALESCE(source_document_id, 0)"),
            sa.literal_column("COALESCE(span_annotation_id, 0)"),
            sa.literal_column("COALESCE(bbox_annotation_id, 0)"),
            sa.literal_column("COALESCE(sentence_annotation_id, 0)"),
            sa.literal_column("COALESCE(span_group_id, 0)"),
            sa.literal_column("COALESCE(tag_id, 0)"),
            sa.literal_column("COALESCE(memo_id, 0)"),
        ],
        unique=True,
    )
    op.create_unique_constraint(
        op.f("UC_only_one_object_handle_per_instance"),
        "objecthandle",
        [
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
        ],
        postgresql_nulls_not_distinct=False,
    )
    op.create_index(
        op.f("ix_objecthandle_user_id"), "objecthandle", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_objecthandle_memo_id"), "objecthandle", ["memo_id"], unique=False
    )
    op.create_check_constraint(
        "CC_object_handle_refers_to_exactly_one_instance",
        "objecthandle",
        """(
            CASE WHEN user_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN project_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN memo_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN bbox_annotation_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN sentence_annotation_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN span_group_id IS NULL THEN 0 ELSE 1 END
            + CASE WHEN tag_id IS NULL THEN 0 ELSE 1 END
        ) = 1""",
    )
    op.create_foreign_key(
        op.f("wordfrequency_sdoc_id_fkey"),
        "wordfrequency",
        "sourcedocument",
        ["sdoc_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documenttagrecommendationlink_predicted_tag_id_fkey"),
        "tagrecommendationlink",
        "tag",
        ["predicted_tag_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documenttagrecommendationlink_source_document_id_fkey"),
        "tagrecommendationlink",
        "sourcedocument",
        ["source_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documenttag_parent_tag_id_fkey"),
        "tag",
        "tag",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("spangroup_annotation_document_id_fkey"),
        "spangroup",
        "annotationdocument",
        ["annotation_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("spanannotationspangrouplinktable_span_group_id_fkey"),
        "spanannotationspangrouplinktable",
        "spangroup",
        ["span_group_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("spanannotationspangrouplinktable_span_annotation_id_fkey"),
        "spanannotationspangrouplinktable",
        "spanannotation",
        ["span_annotation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("FK_span_annotation_source_code_id"),
        "spanannotation",
        "code",
        ["source_code_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("spanannotation_annotation_document_id_fkey"),
        "spanannotation",
        "annotationdocument",
        ["annotation_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("spanannotation_code_id_fkey"),
        "spanannotation",
        "code",
        ["code_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("FK_span_annotation_source_annotation_id"),
        "spanannotation",
        "spanannotation",
        ["source_annotation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("sourcedocumentdocumenttaglinktable_source_document_id_fkey"),
        "sourcedocumenttaglinktable",
        "sourcedocument",
        ["source_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("sourcedocumentdocumenttaglinktable_document_tag_id_fkey"),
        "sourcedocumenttaglinktable",
        "tag",
        ["tag_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("sourcedocumentstepstatus_sdoc_id_fkey"),
        "sourcedocumentstepstatus",
        "sourcedocument",
        ["sdoc_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("sourcedocumentmetadata_project_metadata_id_fkey"),
        "sourcedocumentmetadata",
        "projectmetadata",
        ["project_metadata_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("sourcedocumentmetadata_source_document_id_fkey"),
        "sourcedocumentmetadata",
        "sourcedocument",
        ["source_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("sourcedocumentdata_id_fkey"),
        "sourcedocumentdata",
        "sourcedocument",
        ["id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("fk_sourcedocument_folder_id"),
        "sourcedocument",
        "folder",
        ["folder_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("FK_sentence_annotation_source_annotation_id"),
        "sentenceannotation",
        "sentenceannotation",
        ["source_annotation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("sentenceannotation_annotation_document_id_fkey"),
        "sentenceannotation",
        "annotationdocument",
        ["annotation_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("FK_sentence_annotation_source_code_id"),
        "sentenceannotation",
        "code",
        ["source_code_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("sentenceannotation_code_id_fkey"),
        "sentenceannotation",
        "code",
        ["code_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("promptversion_prompt_id_fkey"),
        "promptversion",
        "prompt",
        ["prompt_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_bbox_annotation_id_fkey"),
        "objecthandle",
        "bboxannotation",
        ["bbox_annotation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_sentence_annotation_id_fkey"),
        "objecthandle",
        "sentenceannotation",
        ["sentence_annotation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_tag_id_fkey"),
        "objecthandle",
        "tag",
        ["tag_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_user_id_fkey"),
        "objecthandle",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_span_annotation_id_fkey"),
        "objecthandle",
        "spanannotation",
        ["span_annotation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_code_id_fkey"),
        "objecthandle",
        "code",
        ["code_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_source_document_id_fkey"),
        "objecthandle",
        "sourcedocument",
        ["source_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_memo_id_fkey"),
        "objecthandle",
        "memo",
        ["memo_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("objecthandle_span_group_id_fkey"),
        "objecthandle",
        "spangroup",
        ["span_group_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("memorecent_memo_id_fkey"),
        "memorecent",
        "memo",
        ["memo_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("memofavoritelinktable_memo_id_fkey"),
        "memofavoritelinktable",
        "memo",
        ["memo_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("memo_attached_to_id_fkey"),
        "memo",
        "objecthandle",
        ["attached_to_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("folder_parent_id_fkey"),
        "folder",
        "folder",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("experimentrun_prompt_version_id_fkey"),
        "experimentrun",
        "promptversion",
        ["prompt_version_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("experimentrun_experiment_id_fkey"),
        "experimentrun",
        "experiment",
        ["experiment_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documentcluster_cluster_id_fkey"),
        "documentcluster",
        "cluster",
        ["cluster_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documentcluster_sdoc_id_fkey"),
        "documentcluster",
        "sourcedocument",
        ["sdoc_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documentaspect_sdoc_id_fkey"),
        "documentaspect",
        "sourcedocument",
        ["sdoc_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("documentaspect_aspect_id_fkey"),
        "documentaspect",
        "aspect",
        ["aspect_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("code_parent_code_id_fkey"),
        "code",
        "code",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("cluster_aspect_id_fkey"),
        "cluster",
        "aspect",
        ["aspect_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("cluster_parent_cluster_id_fkey"),
        "cluster",
        "cluster",
        ["parent_cluster_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("classifiertaglinktable_classifier_id_fkey"),
        "classifiertaglinktable",
        "classifier",
        ["classifier_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("classifiertaglinktable_tag_id_fkey"),
        "classifiertaglinktable",
        "tag",
        ["tag_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("classifierevaluation_classifier_id_fkey"),
        "classifierevaluation",
        "classifier",
        ["classifier_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("classifiercodelinktable_code_id_fkey"),
        "classifiercodelinktable",
        "code",
        ["code_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("classifiercodelinktable_classifier_id_fkey"),
        "classifiercodelinktable",
        "classifier",
        ["classifier_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("bboxannotation_code_id_fkey"),
        "bboxannotation",
        "code",
        ["code_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("FK_bbox_annotation_source_code_id"),
        "bboxannotation",
        "code",
        ["source_code_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("bboxannotation_annotation_document_id_fkey"),
        "bboxannotation",
        "annotationdocument",
        ["annotation_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("FK_bbox_annotation_source_annotation_id"),
        "bboxannotation",
        "bboxannotation",
        ["source_annotation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("aspect_tag_id_fkey"),
        "aspect",
        "tag",
        ["tag_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        op.f("annotationdocument_source_document_id_fkey"),
        "annotationdocument",
        "sourcedocument",
        ["source_document_id"],
        ["id"],
        ondelete="CASCADE",
    )
