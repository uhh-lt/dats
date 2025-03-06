import base64
import io
from pathlib import Path

from PIL import Image


def load_image(img_path: Path | str) -> Image.Image:
    return Image.open(img_path).convert("RGB")


def image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")
