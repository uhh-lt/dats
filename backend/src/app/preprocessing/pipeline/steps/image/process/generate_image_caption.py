from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompts.image_captioning_prompt import (
    IMG_CAPTION_USER_PROMPT,
)
from app.core.data.repo.utils import (
    image_to_base64,
    load_image,
)
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

ollama = OllamaService()


def generate_image_caption(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    if "caption" not in ppid.metadata:
        image = load_image(ppid.filepath)
        image_b64 = image_to_base64(image)
        caption, _ = ollama.vlm_chat(
            user_prompt=IMG_CAPTION_USER_PROMPT, b64_images=[image_b64]
        )
        ppid.metadata["caption"] = caption

    return cargo
