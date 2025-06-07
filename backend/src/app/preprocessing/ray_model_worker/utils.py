import base64
from io import BytesIO
from pathlib import Path

import numpy as np
from bs4 import BeautifulSoup
from dto.docling import DoclingPDF2HTMLOutput
from PIL import Image
from scipy.io import wavfile


def base64_to_image(base64_string: str) -> Image.Image:
    img_data = base64.b64decode(base64_string)
    return Image.open(BytesIO(img_data)).convert("RGB")


def image_to_base64(image: Image.Image) -> str:
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


def read_html_and_replace_absolute_image_paths(
    html_filename: Path, rel_to: Path
) -> str:
    if (
        not html_filename.exists()
        or not html_filename.is_file()
        or not html_filename.suffix.lower() == ".html"
    ):
        raise ValueError(f"Input file {html_filename} is not a valid HTML file.")
    if not rel_to.exists() or not rel_to.is_dir():
        raise ValueError(
            f"Relative path {rel_to} does not exist or is not a directory."
        )
    # load html and replace absolute image paths with relative ones
    html_content = html_filename.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_content, "html.parser")
    for img in soup.find_all("img"):
        img_src = Path(img["src"])  # type: ignore
        if img_src.is_absolute():
            img["src"] = str(img_src.relative_to(rel_to))  # type: ignore
    html_content = str(soup)
    return html_content


def create_docling_pdf_conversion_output(
    html_filename: Path,
    out_dir: Path,
) -> DoclingPDF2HTMLOutput:
    html_content = read_html_and_replace_absolute_image_paths(
        html_filename,
        out_dir,
    )

    base64_images = {}
    for img_path in out_dir.glob("**/*.png"):
        img = Image.open(img_path).convert("RGB")
        base64_images[img_path.name] = image_to_base64(img)

    return DoclingPDF2HTMLOutput(
        html_content=html_content,
        base64_images=base64_images,
    )
