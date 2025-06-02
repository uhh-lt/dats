"""unique span text

Revision ID: b2e6991379f5
Revises: 312438bf1885
Create Date: 2024-10-16 13:20:28.732724

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from tqdm import tqdm

# revision identifiers, used by Alembic.
revision: str = "b2e6991379f5"
down_revision: Union[str, None] = "312438bf1885"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a temporary table to store the minimum id for each text
    op.execute(
        """
        CREATE TEMPORARY TABLE temp_min_spantext AS
        SELECT MIN(id) as min_id, text
        FROM spantext
        GROUP BY text;
        """
    )
    print("Created temp_min_spantext")

    # Create a temporary table to map old IDs to new IDs
    op.execute(
        """
        CREATE TEMPORARY TABLE temp_id_mapping AS
        SELECT spanannotation.id AS span_anno_id, temp_min_spantext.min_id AS new_id
        FROM spanannotation
        JOIN spantext ON spanannotation.span_text_id = spantext.id
        JOIN temp_min_spantext ON spantext.text = temp_min_spantext.text;
        """
    )
    print("Created temp_id_mapping")

    # Update foreign keys using the mapping table
    op.execute(
        """
        UPDATE spanannotation
        SET span_text_id = temp_id_mapping.new_id
        FROM temp_id_mapping
        WHERE spanannotation.id = temp_id_mapping.span_anno_id;
        """
    )
    print("Updated foreign keys")

    # Fetch the IDs to be deleted into a Python list
    connection = op.get_bind()
    delete_ids = connection.execute(
        sa.text(
            """
        SELECT st.id
        FROM spantext st
        JOIN temp_min_spantext tms ON st.text = tms.text
        WHERE st.id != tms.min_id;
        """
        )
    ).fetchall()

    # Convert the result to a list of IDs
    delete_ids = [row[0] for row in delete_ids]
    print(f"Found {len(delete_ids)} duplicates to remove")

    # Define the batch size
    BATCH_SIZE = 10000

    # Remove duplicates in batches
    for i in tqdm(range(0, len(delete_ids), BATCH_SIZE), desc="Removing duplicates"):
        batch_ids = delete_ids[i : i + BATCH_SIZE]
        connection.execute(
            sa.text(
                """
            DELETE FROM spantext
            WHERE id IN :batch_ids;
            """
            ),
            {"batch_ids": tuple(batch_ids)},
        )

    print("Removed duplicates in batches")

    # Drop the temporary tables
    op.execute("DROP TABLE temp_min_spantext;")
    op.execute("DROP TABLE temp_id_mapping;")
    print("Dropped temporary tables")

    # Make text unique
    op.drop_index("ix_spantext_text", table_name="spantext")
    op.create_index(op.f("ix_spantext_text"), "spantext", ["text"], unique=True)
    print("Made text unique")


def downgrade() -> None:
    op.drop_index(op.f("ix_spantext_text"), table_name="spantext")
    op.create_index("ix_spantext_text", "spantext", ["text"], unique=False)
    # ### end Alembic commands ###
