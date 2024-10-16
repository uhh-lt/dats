"""vscode launcher

Revision ID: b2e6991379f5
Revises: 312438bf1885
Create Date: 2024-10-16 13:20:28.732724

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2e6991379f5"
down_revision: Union[str, None] = "312438bf1885"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # update foreign keys
    op.execute(
        """
        UPDATE spanannotation
        SET span_text_id = (
            SELECT MIN(spantext.id)
            FROM spantext, (
                SELECT text
                FROM spantext
                WHERE spantext.id = spanannotation.span_text_id
            ) sub
            WHERE spantext.text = sub.text
            GROUP BY spantext.text
        )
        """
    )

    # remove duplicates
    op.execute(
        """
        DELETE FROM spantext
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM spantext
            GROUP BY text
        );
        """
    )

    # make text unique
    op.drop_index("ix_spantext_text", table_name="spantext")
    op.create_index(op.f("ix_spantext_text"), "spantext", ["text"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_spantext_text"), table_name="spantext")
    op.create_index("ix_spantext_text", "spantext", ["text"], unique=False)
    # ### end Alembic commands ###
