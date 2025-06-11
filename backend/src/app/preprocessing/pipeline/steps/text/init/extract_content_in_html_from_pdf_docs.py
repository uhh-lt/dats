import math
from pathlib import Path

import fitz
from app.core.data.repo.repo_service import RepoService
from app.core.data.repo.utils import base64_to_image
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.preprocessing.preprocessing_service import PreprocessingService
from app.preprocessing.ray_model_service import RayModelService
from config import conf
from loguru import logger

cc = conf.celery

repo = RepoService()
pps = PreprocessingService()
rms = RayModelService()


def __split_large_pdf_into_chunks(
    input_doc: Path, max_pages_per_chunk: int = 5
) -> list[Path] | None:
    try:
        src = fitz.open(str(input_doc))  # type: ignore
        total_pages = src.page_count
    except Exception as e:
        msg = f"Error opening PDF {input_doc.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # First, we check if the PDF needs to be split
    num_splits = math.ceil(total_pages / max_pages_per_chunk)
    if num_splits == 1:
        logger.info(f"PDF {input_doc.name} has {total_pages} pages; no split needed.")
        src.close()
        return None

    # Calculate the number of digits needed for zero-padding
    total_digits = len(str(total_pages))

    # If yes, we proceed to split the PDF and save the chunks to disk in the project repo
    out_dir = input_doc.parent
    logger.info(
        f"Splitting PDF {input_doc.name} into {num_splits} chunks of "
        f"up to {max_pages_per_chunk} pages each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i in range(num_splits):
        start_page = i * max_pages_per_chunk + 1
        end_page = min((i + 1) * max_pages_per_chunk, total_pages)
        # Format page range with zero-padding
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{input_doc.stem}_pages_{page_range_str}.pdf"
        try:
            # Create a new PDF for the chunk
            new_pdf = fitz.open()  # type: ignore
            new_pdf.insert_pdf(src, from_page=start_page - 1, to_page=end_page - 1)

            # Save the chunk to disk
            new_pdf.save(str(output_fn))
            new_pdf.close()
            chunks.append(output_fn)

            logger.debug(f"Stored chunk '{output_fn}'")
        except Exception as e:
            msg = f"Skipping due to error creating chunk {i + 1} for PDF {input_doc.name}: {e}"
            logger.error(msg)
    src.close()
    return chunks


def __extract_content_in_html_from_pdf_docs(
    filepath: Path, extract_images: bool = True
) -> tuple[str, list[Path]]:
    if not filepath.exists() or filepath.suffix != ".pdf":
        logger.error(f"File {filepath} is not a PDF document!")
        return "", []

    logger.debug(f"Extracting content as HTML from {filepath.name} ...")
    pdf_bytes = filepath.read_bytes()
    # this will take some time ...
    conversion_output = rms.docling_pdf_to_html(pdf_bytes=pdf_bytes)
    doc_html = conversion_output.html_content

    # store all extracted images in the same directory as the PDF
    extracted_images: list[Path] = []
    if extract_images:
        output_path = filepath.parent
        for img_fn, b64_img in conversion_output.base64_images.items():
            img_fn = Path(img_fn)
            img_path = output_path / (img_fn.stem + ".png")
            img = base64_to_image(b64_img)
            img.save(img_path, format="PNG")
            extracted_images.append(img_path)
            logger.debug(f"Saved extracted image {img_path} from PDF {filepath.name}.")

    return doc_html, extracted_images


def extract_content_in_html_from_pdf_docs(
    cargo: PipelineCargo,
) -> PipelineCargo:
    ## STRATEGY:
    # 0. check if PDF needs to be chunked, i.e., if it has more than N (per default 5) pages.
    # YES:
    # 1. Chunk the PDF
    # 2. stop prepro for cargo (not the whole PPJ!)
    # 3. create a new PPJ from the chunks
    # NO:
    # 1. continue with extracting content as HTML including images from PDF via Docling through RayModelService

    ## TODO Open Questions:
    # - how to properly link the chunks concerning the page order and SDoc links to navigate in the UI?
    # - can we maybe have some sort of Parent SDoc (no Adoc!) that links the chunk sdocs?

    pptd: PreProTextDoc = cargo.data["pptd"]
    filepath = pptd.filepath

    if filepath.suffix != ".pdf":
        return cargo

    # Split large PDFs into chunks if necessary
    chunks = __split_large_pdf_into_chunks(
        filepath, max_pages_per_chunk=cc.preprocessing.max_pages_per_pdf_chunk
    )

    if chunks:
        # YES -> stop prepro for cargo, start PPJ with all chunks
        # (we cannot stop the whole PPJ because it might contain more payloads)
        cargo._flush_next_steps()

        logger.info(f"Starting new PPJ for {len(chunks)} PDF chunks ...")
        ppj = pps.prepare_and_start_preprocessing_job_async(
            proj_id=cargo.ppj_payload.project_id,
            uploaded_files=None,
            archive_file_path=None,
            unimported_project_files=chunks,
        )
        logger.info(
            f"Started new PreprocessingJob {ppj.id} for {len(chunks)} PDF chunks."
        )

        return cargo

    # NO -> continue with extracting content as HTML from PDF
    html, extracted_images = __extract_content_in_html_from_pdf_docs(
        filepath,
        extract_images=cc.preprocessing.extract_images_from_pdf,
    )

    pptd.html = html
    pptd.extracted_images = extracted_images

    return cargo
