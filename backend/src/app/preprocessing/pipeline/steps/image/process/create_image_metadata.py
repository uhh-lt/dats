from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from PIL import Image


def create_image_metadata(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    # TODO: check if metadata has aready been set
    with Image.open(ppid.filepath) as img:
        ppid.metadata["width"] = str(img.width)
        ppid.metadata["height"] = str(img.height)
        ppid.metadata["format"] = str(img.format)
        ppid.metadata["mode"] = str(img.mode)

        # exif data
        # exifdata = img.getexif()
        # for tag_id in exifdata:
        # get the tag name, instead of human unreadable tag id
        # tag = str(TAGS.get(tag_id, tag_id))
        # data = exifdata.get(tag_id)
        # # decode bytes
        # if isinstance(data, bytes):
        #     data = data.decode()
        # if data is not None and data != "":
        #     logger.info(f"create image metadata tag: {tag} data: {data}")
        #     ppid.metadata[tag] = str(data)

    return cargo
