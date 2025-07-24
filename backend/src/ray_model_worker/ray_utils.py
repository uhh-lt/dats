import base64
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.io import wavfile


def base64_to_image(base64_string: str) -> Image.Image:
    img_data = base64.b64decode(base64_string)
    return Image.open(BytesIO(img_data)).convert("RGB")


def image_to_base64(image: Image.Image | Path) -> str:
    if isinstance(image, Path):
        image = Image.open(image).convert("RGB")
    if not isinstance(image, Image.Image):
        raise ValueError("Input must be a PIL Image or a Path to an image file.")
    buffered = BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return img_str


def bytes_to_wav_data(wav_bytes: bytes) -> np.ndarray:
    return wavfile.read(BytesIO(wav_bytes))[1]


def write_bytes_to_file(file_bytes: bytes, fn: Path) -> Path:
    fn.parent.mkdir(parents=True, exist_ok=True)
    fn.write_bytes(file_bytes)
    if not fn.exists():
        raise FileNotFoundError(f"File {fn} could not be saved!")
    return fn
