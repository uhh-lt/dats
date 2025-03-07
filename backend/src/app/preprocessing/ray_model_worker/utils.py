import base64
from io import BytesIO

import numpy as np
from PIL import Image
from scipy.io import wavfile


def base64_to_image(base64_string: str) -> Image.Image:
    img_data = base64.b64decode(base64_string)
    return Image.open(BytesIO(img_data)).convert("RGB")


def bytes_to_wav_data(wav_bytes: bytes) -> np.ndarray:
    return wavfile.read(BytesIO(wav_bytes))[1]
