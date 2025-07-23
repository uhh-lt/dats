from pydantic import BaseModel, Field


class DoclingPDF2HTMLOutput(BaseModel):
    html_content: str = Field(
        description="The HTML content of the converted PDF document.",
        examples=["<html><body><h1>Converted PDF</h1></body></html>"],
    )
    base64_images: dict[str, str] = Field(
        description="A dictionary mapping image names to their base64 encoded content.",
        examples=[
            {
                "image1.png": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
                "image2.jpg": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
            }
        ],
    )
