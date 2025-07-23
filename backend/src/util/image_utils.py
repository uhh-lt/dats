import base64
import io
from pathlib import Path

from PIL import Image


def load_image(img_path: Path | str) -> Image.Image:
    img_path = Path(img_path)
    if not img_path.exists():
        raise FileNotFoundError(f"Image file not found at {img_path}")
    return Image.open(img_path).convert("RGB")


def image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def base64_to_image(base64_string: str) -> Image.Image:
    img_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(img_data)).convert("RGB")
