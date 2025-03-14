from PIL import Image

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

repo: RepoService = RepoService()


def convert_to_webp_and_generate_thumbnails(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    with Image.open(ppid.filepath) as im:
        web_p_fn = repo.generate_sdoc_filename(
            ppid.filepath, webp=True, thumbnail=False
        )
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
            ppid.filepath, webp=True, thumbnail=True
        )
        im.thumbnail((128, 128))
        im.save(
            thumbnail_fn,
            "WEBP",
            quality=100,
            lossless=True,
            method=6,
        )

    return cargo
