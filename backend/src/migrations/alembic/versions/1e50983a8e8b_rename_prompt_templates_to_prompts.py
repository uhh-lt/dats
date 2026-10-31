"""rename prompt templates to prompts

Revision ID: 1e50983a8e8b
Revises: 4de77d23f187
Create Date: 2026-10-31 17:13:00.283261

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1e50983a8e8b"
down_revision: str | None = "4de77d23f187"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Everything is renamed in place, so all prompts and their versions are kept.
# (old name, new name) of every table, index, constraint and sequence
_INDEXES = [
    ("ix_prompttemplate_created", "ix_prompt_created"),
    ("ix_prompttemplate_id", "ix_prompt_id"),
    ("ix_prompttemplate_is_archived", "ix_prompt_is_archived"),
    ("ix_prompttemplate_language", "ix_prompt_language"),
    ("ix_prompttemplate_name", "ix_prompt_name"),
    ("ix_prompttemplate_project_id", "ix_prompt_project_id"),
    ("ix_prompttemplate_task_type", "ix_prompt_task_type"),
    ("ix_prompttemplateversion_created", "ix_promptversion_created"),
    ("ix_prompttemplateversion_id", "ix_promptversion_id"),
    ("ix_prompttemplateversion_prompt_template_id", "ix_promptversion_prompt_id"),
    ("ix_prompttemplateversion_user_id", "ix_promptversion_user_id"),
    ("ix_prompttemplateversion_version", "ix_promptversion_version"),
]
# (table after the table rename, old name, new name)
_CONSTRAINTS = [
    ("prompt", "prompttemplate_pkey", "prompt_pkey"),
    ("prompt", "prompttemplate_project_id_fkey", "prompt_project_id_fkey"),
    (
        "prompt",
        "UC_prompt_template_name_unique_per_project",
        "UC_prompt_name_unique_per_project",
    ),
    ("promptversion", "prompttemplateversion_pkey", "promptversion_pkey"),
    (
        "promptversion",
        "prompttemplateversion_prompt_template_id_fkey",
        "promptversion_prompt_id_fkey",
    ),
    (
        "promptversion",
        "prompttemplateversion_user_id_fkey",
        "promptversion_user_id_fkey",
    ),
    (
        "promptversion",
        "UC_prompt_template_version_unique_per_template",
        "UC_prompt_version_unique_per_prompt",
    ),
]
_SEQUENCES = [
    ("prompttemplate_id_seq", "prompt_id_seq"),
    ("prompttemplateversion_id_seq", "promptversion_id_seq"),
]


def upgrade() -> None:
    # 1) tables and columns
    op.rename_table("prompttemplate", "prompt")
    op.rename_table("prompttemplateversion", "promptversion")
    op.alter_column("promptversion", "prompt_template_id", new_column_name="prompt_id")
    op.alter_column("promptversion", "prompt", new_column_name="text")

    # 2) the names derived from them
    for old, new in _INDEXES:
        op.execute(f'ALTER INDEX "{old}" RENAME TO "{new}"')
    for table, old, new in _CONSTRAINTS:
        op.execute(f'ALTER TABLE "{table}" RENAME CONSTRAINT "{old}" TO "{new}"')
    for old, new in _SEQUENCES:
        op.execute(f'ALTER SEQUENCE "{old}" RENAME TO "{new}"')


def downgrade() -> None:
    for old, new in _SEQUENCES:
        op.execute(f'ALTER SEQUENCE "{new}" RENAME TO "{old}"')
    for table, old, new in _CONSTRAINTS:
        op.execute(f'ALTER TABLE "{table}" RENAME CONSTRAINT "{new}" TO "{old}"')
    for old, new in _INDEXES:
        op.execute(f'ALTER INDEX "{new}" RENAME TO "{old}"')

    op.alter_column("promptversion", "text", new_column_name="prompt")
    op.alter_column("promptversion", "prompt_id", new_column_name="prompt_template_id")
    op.rename_table("promptversion", "prompttemplateversion")
    op.rename_table("prompt", "prompttemplate")
