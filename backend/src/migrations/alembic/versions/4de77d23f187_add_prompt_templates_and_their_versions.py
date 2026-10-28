"""add prompt templates and their versions

Revision ID: 4de77d23f187
Revises: a6f3f0b40d52
Create Date: 2026-10-28 15:16:45.411994

"""

import json
from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "4de77d23f187"
down_revision: str | None = "a6f3f0b40d52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# The default prompt templates that every existing project gets, frozen at the time
# of this migration. Later changes of the defaults only affect new projects.
DEFAULT_PROMPT_TEMPLATES = [
    {
        "name": "default-document-tagging-en",
        "task_type": "TAGGING",
        "language": "en",
        "prompt": (
            "Please classify the document into all appropriate categories below. Multiple or zero categories are possible:\n"
            "<tags>\n"
            "\n"
            "<output-format:tags>\n"
            "\n"
            "Document:\n"
            "<document:whole>\n"
            "\n"
            "Remember, you MUST classify the document using the provided categories, do not generate new categories!"
        ),
    },
    {
        "name": "default-document-tagging-de",
        "task_type": "TAGGING",
        "language": "de",
        "prompt": (
            "Bitte klassifiziere das Dokument in alle passenden folgenden Kategorien. Es sind mehrere oder keine Kategorien möglich:\n"
            "<tags>\n"
            "\n"
            "<output-format:tags>\n"
            "\n"
            "Dokument:\n"
            "<document:whole>\n"
            "\n"
            "Denke daran, das Dokument MUSS mithilfe der gegebenen Kategorien klassifiziert werden, generiere keine neuen Kategorien!"
        ),
    },
    {
        "name": "default-metadata-extraction-en",
        "task_type": "METADATA_EXTRACTION",
        "language": "en",
        "prompt": (
            "Please extract the following information from the provided document. It is possible that not all information is contained in the document:\n"
            "<metadata_fields>\n"
            "\n"
            "<output-format:metadata>\n"
            "\n"
            "Document:\n"
            "<document:whole>\n"
            "\n"
            "Remember, you MUST extract the information verbatim from the document, do not generate facts!"
        ),
    },
    {
        "name": "default-metadata-extraction-de",
        "task_type": "METADATA_EXTRACTION",
        "language": "de",
        "prompt": (
            "Bitte extrahiere die folgenden Informationen aus dem Dokument. Es kann sein, dass nicht alle Informationen im Dokument enthalten sind:\n"
            "<metadata_fields>\n"
            "\n"
            "<output-format:metadata>\n"
            "\n"
            "Dokument:\n"
            "<document:whole>\n"
            "\n"
            "Denke daran, die Informationen MÜSSEN wörtlich aus dem Dokument extrahiert werden, generiere keine Fakten!"
        ),
    },
    {
        "name": "default-sentence-annotation-en",
        "task_type": "SENTENCE_ANNOTATION",
        "language": "en",
        "prompt": (
            "Please use the following categories to classify sentences of the provided document:\n"
            "<codes>\n"
            "\n"
            "<output-format:sentences>\n"
            "\n"
            "<examples>\n"
            "\n"
            "This is the document, sentence by sentence:\n"
            "<document:whole>\n"
            "\n"
            "Remember you do not have to provide a category for each sentence. Only assign a category if you are sure that the category fits well to the sentence. Use only the provided categories!"
        ),
    },
    {
        "name": "default-sentence-annotation-de",
        "task_type": "SENTENCE_ANNOTATION",
        "language": "de",
        "prompt": (
            "Bitte nutze die folgenden Kategorien um Sätze des gegebenen Dokumentes zu klassifizieren:\n"
            "<codes>\n"
            "\n"
            "<output-format:sentences>\n"
            "\n"
            "<examples>\n"
            "\n"
            "Dies ist das Dokument, Satz für Satz:\n"
            "<document:whole>\n"
            "\n"
            "Denke daran, dass du nicht für jeden Satz eine Kategorie angeben musst. Vergebe nur eine Kategorie, wenn du dir sicher bist, dass die Kategorie gut zu dem Satz passt. Verwende ausschließlich die bereitgestellten Kategorien!"
        ),
    },
    {
        "name": "default-span-annotation-inline-tagging-en",
        "task_type": "ANNOTATION",
        "language": "en",
        "prompt": (
            "You are an assistant that identifies and classifies relevant text passages.\n"
            "\n"
            "Allowed codes:\n"
            "<code_names>\n"
            "\n"
            "Code definitions:\n"
            "<codes>\n"
            "\n"
            "<output-format:inline>\n"
            "\n"
            "<examples>\n"
            "\n"
            "Text:\n"
            "<document:whole>"
        ),
    },
    {
        "name": "default-span-annotation-inline-tagging-de",
        "task_type": "ANNOTATION",
        "language": "de",
        "prompt": (
            "Du bist ein Assistent, der relevante Textpassagen identifiziert und klassifiziert.\n"
            "\n"
            "Erlaubte Codes:\n"
            "<code_names>\n"
            "\n"
            "Code-Definitionen:\n"
            "<codes>\n"
            "\n"
            "<output-format:inline>\n"
            "\n"
            "<examples>\n"
            "\n"
            "Text:\n"
            "<document:whole>"
        ),
    },
    {
        "name": "default-span-annotation-context-anchored-extraction-en",
        "task_type": "ANNOTATION",
        "language": "en",
        "prompt": (
            "You are an extraction engine that identifies relevant text passages.\n"
            "\n"
            "Allowed codes:\n"
            "<code_names>\n"
            "\n"
            "Code definitions:\n"
            "<codes>\n"
            "\n"
            "<output-format:context>\n"
            "\n"
            "<examples>\n"
            "\n"
            "Text:\n"
            "<document:chunks>"
        ),
    },
    {
        "name": "default-span-annotation-context-anchored-extraction-de",
        "task_type": "ANNOTATION",
        "language": "de",
        "prompt": (
            "Du bist eine Extraktions-Engine, die relevante Textpassagen identifiziert.\n"
            "\n"
            "Erlaubte Codes:\n"
            "<code_names>\n"
            "\n"
            "Code-Definitionen:\n"
            "<codes>\n"
            "\n"
            "<output-format:context>\n"
            "\n"
            "<examples>\n"
            "\n"
            "Text:\n"
            "<document:chunks>"
        ),
    },
]
# the default settings of the blocks (PromptSettings)
DEFAULT_SETTINGS = {
    "chunk_size_tokens": 650,
    "chunk_overlap_tokens": 100,
    "context_before_chars": 64,
    "context_after_chars": 64,
    "fuzzy_threshold": 0.85,
}
# templates created by the migration belong to the system user
SYSTEM_USER_ID = 1


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "prompttemplate",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("task_type", sa.String(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column(
            "created",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "name", name="UC_prompt_template_name_unique_per_project"
        ),
    )
    op.create_index(
        op.f("ix_prompttemplate_created"), "prompttemplate", ["created"], unique=False
    )
    op.create_index(
        op.f("ix_prompttemplate_id"), "prompttemplate", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_prompttemplate_is_archived"),
        "prompttemplate",
        ["is_archived"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prompttemplate_language"), "prompttemplate", ["language"], unique=False
    )
    op.create_index(
        op.f("ix_prompttemplate_name"), "prompttemplate", ["name"], unique=False
    )
    op.create_index(
        op.f("ix_prompttemplate_project_id"),
        "prompttemplate",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prompttemplate_task_type"),
        "prompttemplate",
        ["task_type"],
        unique=False,
    )
    op.create_table(
        "prompttemplateversion",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.String(), nullable=False),
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("codes", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("examples", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "metadata_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "created",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("prompt_template_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["prompt_template_id"], ["prompttemplate.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "prompt_template_id",
            "version",
            name="UC_prompt_template_version_unique_per_template",
        ),
    )
    op.create_index(
        op.f("ix_prompttemplateversion_created"),
        "prompttemplateversion",
        ["created"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prompttemplateversion_id"),
        "prompttemplateversion",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prompttemplateversion_prompt_template_id"),
        "prompttemplateversion",
        ["prompt_template_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prompttemplateversion_user_id"),
        "prompttemplateversion",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prompttemplateversion_version"),
        "prompttemplateversion",
        ["version"],
        unique=False,
    )
    # ### end Alembic commands ###

    _create_default_prompt_templates()


def _create_default_prompt_templates() -> None:
    """Give every existing project the default prompt templates as version 1."""
    conn = op.get_bind()
    project_ids = conn.execute(sa.text("SELECT id FROM project")).scalars().all()
    user_id = conn.execute(
        sa.text('SELECT id FROM "user" WHERE id = :id'), {"id": SYSTEM_USER_ID}
    ).scalar_one_or_none()
    for project_id in project_ids:
        for template in DEFAULT_PROMPT_TEMPLATES:
            template_id = conn.execute(
                sa.text(
                    "INSERT INTO prompttemplate "
                    "(name, task_type, language, is_archived, project_id) "
                    "VALUES (:name, :task_type, :language, false, :project_id) "
                    "RETURNING id"
                ),
                {
                    "name": template["name"],
                    "task_type": template["task_type"],
                    "language": template["language"],
                    "project_id": project_id,
                },
            ).scalar_one()
            conn.execute(
                sa.text(
                    "INSERT INTO prompttemplateversion "
                    "(version, prompt, settings, codes, examples, tags, "
                    "metadata_fields, prompt_template_id, user_id) "
                    "VALUES (1, :prompt, CAST(:settings AS jsonb), '[]'::jsonb, "
                    "'[]'::jsonb, '[]'::jsonb, '[]'::jsonb, :prompt_template_id, "
                    ":user_id)"
                ),
                {
                    "prompt": template["prompt"],
                    "settings": json.dumps(DEFAULT_SETTINGS),
                    "prompt_template_id": template_id,
                    "user_id": user_id,
                },
            )


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(
        op.f("ix_prompttemplateversion_version"), table_name="prompttemplateversion"
    )
    op.drop_index(
        op.f("ix_prompttemplateversion_user_id"), table_name="prompttemplateversion"
    )
    op.drop_index(
        op.f("ix_prompttemplateversion_prompt_template_id"),
        table_name="prompttemplateversion",
    )
    op.drop_index(
        op.f("ix_prompttemplateversion_id"), table_name="prompttemplateversion"
    )
    op.drop_index(
        op.f("ix_prompttemplateversion_created"), table_name="prompttemplateversion"
    )
    op.drop_table("prompttemplateversion")
    op.drop_index(op.f("ix_prompttemplate_task_type"), table_name="prompttemplate")
    op.drop_index(op.f("ix_prompttemplate_project_id"), table_name="prompttemplate")
    op.drop_index(op.f("ix_prompttemplate_name"), table_name="prompttemplate")
    op.drop_index(op.f("ix_prompttemplate_language"), table_name="prompttemplate")
    op.drop_index(op.f("ix_prompttemplate_is_archived"), table_name="prompttemplate")
    op.drop_index(op.f("ix_prompttemplate_id"), table_name="prompttemplate")
    op.drop_index(op.f("ix_prompttemplate_created"), table_name="prompttemplate")
    op.drop_table("prompttemplate")
    # ### end Alembic commands ###
