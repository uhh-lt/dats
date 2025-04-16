from pathlib import Path

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from PIL import Image

repo: RepoService = RepoService()


def generate_thumbnails(image_path: Path):
    with Image.open(image_path) as im:
        web_p_fn = repo.generate_sdoc_filename(image_path, webp=True, thumbnail=False)
        # convert to webp
        im.save(
            web_p_fn,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )
        # create thumbnail
        thumbnail_fn = repo.generate_sdoc_filename(
            image_path, webp=True, thumbnail=True
        )
        im.thumbnail((128, 128))
        im.save(
            thumbnail_fn,
            "WEBP",
            quality=100,
            lossless=True,
            method=6,
        )


def convert_to_webp_and_generate_thumbnails(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    generate_thumbnails(ppid.filepath)

    return cargo
