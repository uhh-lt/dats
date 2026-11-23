from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import FILE_STORE, RENAME_STEPS, OldFileLayoutDatabase, alembic_config


def _files(folder: Path) -> dict[str, str]:
    """The files below the folder (relative path -> content)."""
    return {
        str(p.relative_to(folder)): p.read_text()
        for p in sorted(folder.rglob("*"))
        if p.is_file()
    }


# ===========================================================================
# FILE STORE (807bab97f373) TESTS
# ===========================================================================


def test_upgrade_moves_every_file_into_the_folder_of_its_entity(
    old_file_layout_database: OldFileLayoutDatabase,
):
    """Every file of an entity moves to its folder (an already moved file
    stays), the audio stream named like an audio document is copied from it,
    and what belongs to no entity is deleted with docs/, models/, plots/ and
    dataloaders/."""
    db = old_file_layout_database
    ids = db["sdoc_ids"]
    aspect = db["aspect_id"]
    cota = db["cota_id"]
    embedder = f"prompt_embedder_project_{db['project_dir'].name}_aspect_{aspect}_20250101_120000"

    command.upgrade(alembic_config(), FILE_STORE)

    assert _files(db["project_dir"]) == {
        f"sdoc_files/{ids['text.txt']}/text.txt": "docs/text.txt",
        f"sdoc_files/{ids['photo.png']}/photo.png": "docs/photo.png",
        f"thumbnails/{ids['photo.png']}/image.webp": "docs/photo.png.webp",
        f"thumbnails/{ids['photo.png']}/thumbnail.webp": "docs/photo.png.thumbnail.webp",
        f"sdoc_files/{ids['clip.mp4']}/clip.mp4": "docs/clip.mp4",
        f"thumbnails/{ids['clip.mp4']}/thumbnail.webp": "docs/clip.mp4.thumbnail.webp",
        f"audio/{ids['clip.mp4']}/audio.mp3": "docs/clip.mp3",
        f"sdoc_files/{ids['talk.mp4']}/talk.mp4": "docs/talk.mp4",
        f"sdoc_files/{ids['talk.mp3']}/talk.mp3": "docs/talk.mp3",
        f"audio/{ids['talk.mp4']}/audio.mp3": "docs/talk.mp3",
        f"sdoc_files/{ids['moved.txt']}/moved.txt": "moved before",
        f"classifier_models/{db['classifier_id']}/model.ckpt": "models/doc_classifier_abc/epoch=1-step=2.ckpt",
        f"classifier_models/{db['classifier_id']}/train_logs/metrics.csv": "models/doc_classifier_abc/train_logs/metrics.csv",
        f"cota_models/{cota}/model/weights.bin": f"models/cota_{cota}/weights.bin",
        f"cota_models/{cota}/best_model/weights.bin": f"models/cota_{cota}-best-model/weights.bin",
        f"perspectives_models/{aspect}/umap_default": f"models/umap_aspect_{aspect}_default",
        f"perspectives_models/{aspect}/{embedder}/model.safetensors": f"models/prompt_embedder_DocType.text_{embedder.removeprefix('prompt_embedder_')}/model.safetensors",
        f"perspectives_plots/{aspect}/map_thumbnail.png": f"plots/aspect_{aspect}_map_thumbnail.png",
    }


def test_upgrade_drops_the_stored_paths(
    db_session: Session, old_file_layout_database: OldFileLayoutDatabase
):
    """classifier.path and sourcedocumentdata.repo_url are dropped."""
    command.upgrade(alembic_config(), FILE_STORE)

    columns = {
        (row.table_name, row.column_name)
        for row in db_session.execute(
            sa.text(
                "SELECT table_name, column_name FROM information_schema.columns "
                "WHERE table_name IN ('classifier', 'sourcedocumentdata')"
            )
        )
    }
    db_session.commit()
    assert ("classifier", "path") not in columns
    assert ("sourcedocumentdata", "repo_url") not in columns


def test_downgrade_is_not_supported(
    old_file_layout_database: OldFileLayoutDatabase,
):
    """The downgrade raises: the old layout cannot be restored."""
    config = alembic_config()
    command.upgrade(config, FILE_STORE)

    with pytest.raises(NotImplementedError):
        command.downgrade(config, RENAME_STEPS)
