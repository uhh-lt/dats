from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompts.image_captioning_prompt import (
    IMG_DESCRIPTION_USER_PROMPT,
)
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.steps.image.process.util import (
    image_to_base64,
    load_image,
)

ollama = OllamaService()


def generate_image_description(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    if "description" not in ppid.metadata:
        image = load_image(ppid.filepath)
        image_b64 = image_to_base64(image)
        caption, _ = ollama.vlm_chat(
            user_prompt=IMG_DESCRIPTION_USER_PROMPT, b64_images=[image_b64]
        )
        ppid.metadata["description"] = caption

    return cargo
