"""file store

Moves the files of every project from the flat folders `docs/`, `models/`,
`plots/` and `dataloaders/` into one folder per entity:

- `docs/<filename>` -> `sdoc_files/<sdoc_id>/<filename>`
- images: `docs/<filename>.webp` -> `thumbnails/<sdoc_id>/image.webp`,
  `docs/<filename>.thumbnail.webp` -> `thumbnails/<sdoc_id>/thumbnail.webp`
- videos: `docs/<filename>.thumbnail.webp` -> `thumbnails/<sdoc_id>/thumbnail.webp`,
  `docs/<stem>.mp3` -> `audio/<sdoc_id>/audio.mp3`
- the folder of `classifier.path` -> `classifier_models/<classifier_id>/`, its
  checkpoint renamed to `model.ckpt`
- `models/cota_<id>` and `models/cota_<id>-best-model` ->
  `cota_models/<id>/model` and `cota_models/<id>/best_model`
- `models/umap_aspect_<id>_<model>` -> `perspectives_models/<id>/umap_<model>`,
  `models/prompt_embedder_<modality>_<model>` (model named
  `project_<p>_aspect_<id>_<timestamp>`) ->
  `perspectives_models/<id>/prompt_embedder_<model>`,
  `plots/aspect_<id>_map_thumbnail.png` -> `perspectives_plots/<id>/map_thumbnail.png`

What is left in `docs/`, `models/` and `plots/` belongs to no entity
(e.g. split uploads, extracted archives, training checkpoints, files of deleted
entities) and is deleted with them and `dataloaders/`. The moves are renames
and skip what is already moved, so the step can run again. Then the columns
`classifier.path` and `sourcedocumentdata.repo_url` are dropped.

Revision ID: 807bab97f373
Revises: 10b8dac1fdd6
Create Date: 2026-11-23 11:04:12.274124

"""

import re
import shutil
from collections import Counter
from pathlib import Path
from typing import Sequence

import sqlalchemy as sa
from alembic import op
from loguru import logger

from config import conf

# revision identifiers, used by Alembic.
revision: str = "807bab97f373"
down_revision: str | None = "10b8dac1fdd6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UMAP_RE = re.compile(r"^umap_aspect_(\d+)_(.+)$")
PROMPT_EMBEDDER_RE = re.compile(r"^prompt_embedder_.+?_(project_\d+_aspect_(\d+)_.+)$")
MAP_THUMBNAIL_RE = re.compile(r"^aspect_(\d+)_map_thumbnail\.png$")
COTA_RE = re.compile(r"^cota_(\d+)(-best-model)?$")


def _move(src: Path, dst: Path, counts: Counter, kind: str) -> None:
    """Renames src to dst, unless src is missing or dst exists (moved before)."""
    if not src.exists() or dst.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    counts[kind] += 1


def _delete_rest(folder: Path, counts: Counter, kind: str) -> None:
    """Deletes the folder with what is left in it."""
    if not folder.exists():
        return
    counts[kind] += sum(1 for _ in folder.iterdir())
    shutil.rmtree(folder)


def _migrate_project(conn: sa.Connection, project_dir: Path, project_id: int) -> None:
    counts: Counter = Counter()
    docs = project_dir / "docs"
    models = project_dir / "models"
    plots = project_dir / "plots"

    # 1) the uploaded files of the documents, then their derived files
    sdocs = conn.execute(
        sa.text(
            "SELECT id, filename, doctype FROM sourcedocument "
            "WHERE project_id = :project_id"
        ),
        {"project_id": project_id},
    ).all()
    for sdoc in sdocs:
        _move(
            docs / sdoc.filename,
            project_dir / "sdoc_files" / str(sdoc.id) / sdoc.filename,
            counts,
            "documents",
        )
    by_filename = {sdoc.filename: sdoc.id for sdoc in sdocs}
    for sdoc in sdocs:
        thumbnails = project_dir / "thumbnails" / str(sdoc.id)
        if sdoc.doctype == "image":
            _move(
                docs / f"{sdoc.filename}.webp",
                thumbnails / "image.webp",
                counts,
                "images",
            )
        if sdoc.doctype in ("image", "video"):
            _move(
                docs / f"{sdoc.filename}.thumbnail.webp",
                thumbnails / "thumbnail.webp",
                counts,
                "thumbnails",
            )
        if sdoc.doctype == "video":
            audio_name = Path(sdoc.filename).with_suffix(".mp3").name
            dst = project_dir / "audio" / str(sdoc.id) / "audio.mp3"
            if audio_name in by_filename and not dst.exists():
                # the audio stream has the name of an audio document, which
                # moved to its own folder: the video keeps a copy
                src = project_dir / "sdoc_files" / str(by_filename[audio_name])
                if (src / audio_name).exists():
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src / audio_name, dst)
                    counts["audio streams"] += 1
            _move(docs / audio_name, dst, counts, "audio streams")

    # 2) the classifier models: the folder of the checkpoint in `path`
    classifiers = conn.execute(
        sa.text("SELECT id, path FROM classifier WHERE project_id = :project_id"),
        {"project_id": project_id},
    ).all()
    for classifier in classifiers:
        checkpoint = Path(classifier.path)
        dst = project_dir / "classifier_models" / str(classifier.id)
        _move(models / checkpoint.parent.name, dst, counts, "classifier models")
        _move(dst / checkpoint.name, dst / "model.ckpt", counts, "checkpoints")

    # 3) the models of the concept over time analyses
    cota_ids = set(
        conn.execute(
            sa.text(
                "SELECT id FROM conceptovertimeanalysis WHERE project_id = :project_id"
            ),
            {"project_id": project_id},
        ).scalars()
    )
    aspect_ids = set(
        conn.execute(
            sa.text("SELECT id FROM aspect WHERE project_id = :project_id"),
            {"project_id": project_id},
        ).scalars()
    )
    for path in sorted(models.iterdir()) if models.exists() else []:
        if (m := COTA_RE.match(path.name)) and int(m[1]) in cota_ids:
            name = "best_model" if m[2] else "model"
            _move(
                path,
                project_dir / "cota_models" / m[1] / name,
                counts,
                "cota models",
            )
        elif (m := UMAP_RE.match(path.name)) and int(m[1]) in aspect_ids:
            _move(
                path,
                project_dir / "perspectives_models" / m[1] / f"umap_{m[2]}",
                counts,
                "umap models",
            )
        elif (m := PROMPT_EMBEDDER_RE.match(path.name)) and int(m[2]) in aspect_ids:
            if path.name.startswith("prompt_embedder_chkpt_"):
                continue
            _move(
                path,
                project_dir / "perspectives_models" / m[2] / f"prompt_embedder_{m[1]}",
                counts,
                "prompt embedders",
            )
    for path in sorted(plots.iterdir()) if plots.exists() else []:
        if (m := MAP_THUMBNAIL_RE.match(path.name)) and int(m[1]) in aspect_ids:
            _move(
                path,
                project_dir / "perspectives_plots" / m[1] / "map_thumbnail.png",
                counts,
                "map thumbnails",
            )

    # 4) what is left belongs to no entity
    _delete_rest(docs, counts, "deleted files of docs/")
    _delete_rest(models, counts, "deleted files of models/")
    _delete_rest(plots, counts, "deleted files of plots/")
    _delete_rest(project_dir / "dataloaders", counts, "deleted files of dataloaders/")

    logger.info(f"File store of project {project_id}: {dict(counts)}")


def upgrade() -> None:
    conn = op.get_bind()
    projects_dir = Path(conf.filesystem.root_directory) / "projects"
    project_ids = conn.execute(sa.text("SELECT id FROM project")).scalars().all()
    for project_id in project_ids:
        project_dir = projects_dir / str(project_id)
        if project_dir.exists():
            _migrate_project(conn, project_dir, project_id)

    op.drop_column("classifier", "path")
    op.drop_column("sourcedocumentdata", "repo_url")


def downgrade() -> None:
    raise NotImplementedError(
        "The file store cannot be downgraded: the old layout of the files and "
        "the columns classifier.path and sourcedocumentdata.repo_url are gone."
    )
