import base64
import io
from pathlib import Path

from PIL import Image

from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompts.image_captioning_prompt import IC_USER_PROMPT
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

ollama = OllamaService()


def __load_image(img_path: Path | str) -> Image.Image:
    return Image.open(img_path).convert("RGB")


def __image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def generate_image_caption(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    if "caption" not in ppid.metadata:
        image = __load_image(ppid.filepath)
        image_b64 = __image_to_base64(image)
        caption, _ = ollama.vlm_chat(user_prompt=IC_USER_PROMPT, b64_images=[image_b64])
        ppid.metadata["caption"] = caption

    return cargo
