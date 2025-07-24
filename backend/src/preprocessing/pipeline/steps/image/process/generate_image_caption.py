from modules.llm_assistant.prompts.image_captioning_prompt import (
    IMG_CAPTION_USER_PROMPT,
)
from preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from repos.ollama_repo import OllamaRepo
from utils.image_utils import image_to_base64, load_image

ollama = OllamaRepo()


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
