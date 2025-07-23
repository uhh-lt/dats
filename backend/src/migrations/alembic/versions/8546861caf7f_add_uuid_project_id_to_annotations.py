"""add uuid and project_id to annotations

Revision ID: 8546861caf7f
Revises: 6e007e34f05f
Create Date: 2025-04-15 16:36:35.969445

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8546861caf7f"
down_revision: Union[str, None] = "6e007e34f05f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # add the columns, nullable
    op.add_column("bboxannotation", sa.Column("uuid", sa.String(), nullable=True))
    op.add_column(
        "bboxannotation", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column("sentenceannotation", sa.Column("uuid", sa.String(), nullable=True))
    op.add_column(
        "sentenceannotation", sa.Column("project_id", sa.Integer(), nullable=True)
    )
    op.add_column("spanannotation", sa.Column("uuid", sa.String(), nullable=True))
    op.add_column(
        "spanannotation", sa.Column("project_id", sa.Integer(), nullable=True)
    )

    # update the tables to set the uuid and project_id
    conn = op.get_bind()

    # First, ensure the uuid-ossp extension is installed
    conn.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))

    # Get all project IDs
    project_rows = conn.execute(
        sa.text("SELECT id FROM project ORDER BY id")
    ).fetchall()
    project_ids = [row[0] for row in project_rows]

    print(f"Found {len(project_ids)} projects to process")

    # Process each project separately
    for project_id in project_ids:
        print(f"Processing project ID: {project_id}")

        # BBox Annotations for this project
        conn.execute(
            sa.text("""
            UPDATE bboxannotation
            SET uuid = uuid_generate_v4()::text,
                project_id = :project_id
            WHERE annotation_document_id IN (
                SELECT ad.id
                FROM annotationdocument ad
                JOIN sourcedocument sd ON ad.source_document_id = sd.id
                WHERE sd.project_id = :project_id
            )
        """),
            {"project_id": project_id},
        )

        # Sentence Annotations for this project
        conn.execute(
            sa.text("""
            UPDATE sentenceannotation
            SET uuid = uuid_generate_v4()::text,
                project_id = :project_id
            WHERE annotation_document_id IN (
                SELECT ad.id
                FROM annotationdocument ad
                JOIN sourcedocument sd ON ad.source_document_id = sd.id
                WHERE sd.project_id = :project_id
            )
        """),
            {"project_id": project_id},
        )

        # Span Annotations for this project
        conn.execute(
            sa.text("""
            UPDATE spanannotation
            SET uuid = uuid_generate_v4()::text,
                project_id = :project_id
            WHERE annotation_document_id IN (
                SELECT ad.id
                FROM annotationdocument ad
                JOIN sourcedocument sd ON ad.source_document_id = sd.id
                WHERE sd.project_id = :project_id
            )
        """),
            {"project_id": project_id},
        )

        # Print counts for this project
        bbox_count = conn.execute(
            sa.text("""
            SELECT COUNT(*)
            FROM bboxannotation
            WHERE project_id = :project_id
        """),
            {"project_id": project_id},
        ).scalar()

        sentence_count = conn.execute(
            sa.text("""
            SELECT COUNT(*)
            FROM sentenceannotation
            WHERE project_id = :project_id
        """),
            {"project_id": project_id},
        ).scalar()

        span_count = conn.execute(
            sa.text("""
            SELECT COUNT(*)
            FROM spanannotation
            WHERE project_id = :project_id
        """),
            {"project_id": project_id},
        ).scalar()

        print(f"  Project {project_id} updated:")
        print(f"  - BBox annotations: {bbox_count}")
        print(f"  - Sentence annotations: {sentence_count}")
        print(f"  - Span annotations: {span_count}")

    # Verify all annotations have project_id set
    print("\nVerifying all annotations have project_id set:")
    bbox_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM bboxannotation WHERE project_id IS NULL")
    ).scalar()
    sentence_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM sentenceannotation WHERE project_id IS NULL")
    ).scalar()
    span_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM spanannotation WHERE project_id IS NULL")
    ).scalar()

    print(f"BBox annotations without project_id: {bbox_count}")
    print(f"Sentence annotations without project_id: {sentence_count}")
    print(f"Span annotations without project_id: {span_count}")

    # Count all annotations that should have been updated
    total_bbox_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM bboxannotation")
    ).scalar()
    total_sentence_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM sentenceannotation")
    ).scalar()
    total_span_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM spanannotation")
    ).scalar()

    print("\nTotal annotations processed:")
    print(f"- BBox annotations: {total_bbox_count}")
    print(f"- Sentence annotations: {total_sentence_count}")
    print(f"- Span annotations: {total_span_count}")

    # If there are any annotations without project_id, raise an error
    assert bbox_count is not None, "bbox_count should not be None"
    assert sentence_count is not None, "sentence_count should not be None"
    assert span_count is not None, "span_count should not be None"
    if bbox_count > 0 or sentence_count > 0 or span_count > 0:
        raise Exception(
            "Some annotations could not be linked to a project_id. Migration failed."
        )

    # change the columns to non-nullable
    op.alter_column("bboxannotation", "uuid", nullable=False)
    op.alter_column("sentenceannotation", "uuid", nullable=False)
    op.alter_column("spanannotation", "uuid", nullable=False)
    op.alter_column("bboxannotation", "project_id", nullable=False)
    op.alter_column("sentenceannotation", "project_id", nullable=False)
    op.alter_column("spanannotation", "project_id", nullable=False)

    # create the indexes and constraints
    op.create_unique_constraint(
        "UC_bbox_annotation_uuid_unique_per_project",
        "bboxannotation",
        ["project_id", "uuid"],
    )
    op.create_index(
        op.f("ix_bboxannotation_project_id"),
        "bboxannotation",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_bboxannotation_uuid"), "bboxannotation", ["uuid"], unique=False
    )
    op.create_foreign_key(
        "FK_bbox_annotation_project_id",
        "bboxannotation",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_unique_constraint(
        "UC_sentence_annotation_uuid_unique_per_project",
        "sentenceannotation",
        ["project_id", "uuid"],
    )
    op.create_index(
        op.f("ix_sentenceannotation_project_id"),
        "sentenceannotation",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sentenceannotation_uuid"), "sentenceannotation", ["uuid"], unique=False
    )
    op.create_foreign_key(
        "FK_sentence_annotation_project_id",
        "sentenceannotation",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_unique_constraint(
        "UC_span_annotation_uuid_unique_per_project",
        "spanannotation",
        ["project_id", "uuid"],
    )
    op.create_index(
        op.f("ix_spanannotation_project_id"),
        "spanannotation",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_spanannotation_uuid"), "spanannotation", ["uuid"], unique=False
    )
    op.create_foreign_key(
        "FK_span_annotation_project_id",
        "spanannotation",
        "project",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(
        "FK_span_annotation_project_id", "spanannotation", type_="foreignkey"
    )
    op.drop_index(op.f("ix_spanannotation_uuid"), table_name="spanannotation")
    op.drop_index(op.f("ix_spanannotation_project_id"), table_name="spanannotation")
    op.drop_constraint(
        "UC_span_annotation_uuid_unique_per_project", "spanannotation", type_="unique"
    )
    op.drop_column("spanannotation", "project_id")
    op.drop_column("spanannotation", "uuid")
    op.drop_constraint(
        "FK_sentence_annotation_project_id", "sentenceannotation", type_="foreignkey"
    )
    op.drop_index(op.f("ix_sentenceannotation_uuid"), table_name="sentenceannotation")
    op.drop_index(
        op.f("ix_sentenceannotation_project_id"), table_name="sentenceannotation"
    )
    op.drop_constraint(
        "UC_sentence_annotation_uuid_unique_per_project",
        "sentenceannotation",
        type_="unique",
    )
    op.drop_column("sentenceannotation", "project_id")
    op.drop_column("sentenceannotation", "uuid")
    op.drop_constraint(
        "FK_bbox_annotation_project_id", "bboxannotation", type_="foreignkey"
    )
    op.drop_index(op.f("ix_bboxannotation_uuid"), table_name="bboxannotation")
    op.drop_index(op.f("ix_bboxannotation_project_id"), table_name="bboxannotation")
    op.drop_constraint(
        "UC_bbox_annotation_uuid_unique_per_project", "bboxannotation", type_="unique"
    )
    op.drop_column("bboxannotation", "project_id")
    op.drop_column("bboxannotation", "uuid")
    # ### end Alembic commands ###
