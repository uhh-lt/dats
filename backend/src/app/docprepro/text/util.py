from collections import Counter
from pathlib import Path
from typing import List, Dict, Tuple

from langdetect import detect_langs
from loguru import logger
from spacy import Language
from spacy.tokens import Doc
from tika import parser
from tqdm import tqdm

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SourceDocumentRead, SDocStatus
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.text.autospan import AutoSpan
from app.docprepro.text.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status

sql = SQLService(echo=False)
repo = RepoService()

# TODO Flo: Do we want this in the config ?
TIKA_SUPPORTED_FILE_EXTENSIONS = ['.docx', '.doc', '.pdf']


def create_document_content_text_file_via_tika(filepath: Path,
                                               sdoc_db_obj: SourceDocumentORM) -> Tuple[Path, SourceDocumentORM]:
    logger.info(f"Extracting textual content via Tika from {filepath.name} for SourceDocument {sdoc_db_obj.id}...")
    if filepath.suffix not in TIKA_SUPPORTED_FILE_EXTENSIONS:
        raise NotImplementedError(f"File Extension {filepath.suffix} are not supported!")

    parsed = parser.from_file(filename=str(filepath))

    if not int(parsed['status']) == 200:
        logger.warning(f"Couldn't get textual content via Tika from {filepath}!")
        content = ""
    else:
        content = parsed['content'].strip()

    # create a text file with the textual content
    text_filename = filepath.parent.joinpath(f"{filepath.stem}.txt")
    with open(text_filename, 'w') as text_file:
        text_file.write(content)
    logger.info(f"Created text file with content from {filepath.name} for SourceDocument {sdoc_db_obj.id}!")

    return text_filename, sdoc_db_obj


def generate_preprotextdoc(filepath: Path,
                           sdoc_db_obj: SourceDocumentORM) -> PreProTextDoc:
    # if it's not a raw text file, try to extract the content with Apache Tika and store it in a new raw text file
    if filepath.suffix in TIKA_SUPPORTED_FILE_EXTENSIONS:
        filepath, sdoc_db_obj = create_document_content_text_file_via_tika(filepath=filepath, sdoc_db_obj=sdoc_db_obj)

    # read the content from disk
    with open(filepath, "r") as f:
        content = f.read()

    # store the detected language in SourceDocumentMetadata
    doc_lang = detect_langs(content)[0].lang  # TODO Flo: what to do with mixed lang docs?
    lang_metadata_create_dto = SourceDocumentMetadataCreate(key="language",
                                                            value=doc_lang,
                                                            source_document_id=sdoc_db_obj.id,
                                                            read_only=True)

    # store the URL to the file as SourceDocumentMetadata
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    url_metadata_create_dto = SourceDocumentMetadataCreate(key="url",
                                                           value=str(repo.get_sdoc_url(sdoc=sdoc)),
                                                           source_document_id=sdoc_db_obj.id,
                                                           read_only=True)

    # persist SourceDocumentMetadata
    with sql.db_session() as db:
        crud_sdoc_meta.create(db=db, create_dto=lang_metadata_create_dto)
    with sql.db_session() as db:
        crud_sdoc_meta.create(db=db, create_dto=url_metadata_create_dto)

    # create PreProTextDoc
    pptd = PreProTextDoc(filename=sdoc_db_obj.filename,
                         project_id=sdoc_db_obj.project_id,
                         sdoc_id=sdoc_db_obj.id,
                         raw_text=content)
    pptd.metadata[lang_metadata_create_dto.key] = lang_metadata_create_dto.value
    pptd.metadata[url_metadata_create_dto.key] = url_metadata_create_dto.value

    return pptd


def generate_automatic_span_annotations_single_pptd(doc: Doc, pptd: PreProTextDoc) -> PreProTextDoc:
    # add tokens, lemma, POS, and stopword; count word frequencies
    # TODO Flo: Do we want these as Codes/AutoSpans ?
    pptd.word_freqs = Counter()
    for token in doc:
        pptd.tokens.append(token.text)
        pptd.token_character_offsets.append((token.idx, token.idx + len(token.text)))
        pptd.pos.append(token.pos_)
        pptd.lemmas.append(token.lemma_)
        pptd.stopwords.append(token.is_stop)

        if not (token.is_stop or token.is_punct) and (token.is_alpha or token.is_digit):
            pptd.word_freqs.update((token.text,))

    # sort the word freqs!
    pptd.word_freqs = {k: v for (k, v) in sorted(pptd.word_freqs.items(),
                                                 key=lambda i: i[1],
                                                 reverse=True)}
    # use top-5 as keywords
    pptd.keywords = list(pptd.word_freqs.keys())[:5]

    # create AutoSpans for NER
    pptd.spans["NER"] = list()
    for ne in doc.ents:
        auto = AutoSpan(code=f"{ne.label_}",
                        start=ne.start_char,
                        end=ne.end_char,
                        text=ne.text,
                        start_token=ne.start,
                        end_token=ne.end)
        pptd.spans["NER"].append(auto)

    # Flo: update sdoc status
    update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.generated_automatic_span_annotations)

    return pptd


def generate_automatic_span_annotations_sequentially(pptds: List[PreProTextDoc],
                                                     nlp: Dict[str, Language]) -> List[PreProTextDoc]:
    logger.info(f"Generating Automatic Span Annotations in spaCy sequential Mode for {len(pptds)} Documents...")

    for pptd in tqdm(pptds, desc="Generating Automatic Span Annotations in spaCy sequential Mode... "):
        # Flo: use the language specific model for each pptd
        model = nlp[pptd.metadata["language"]] if pptd.metadata["language"] in nlp else nlp["default"]
        doc: Doc = model(pptd.raw_text)
        # Flo: generate the automatic span annotations
        pptd = generate_automatic_span_annotations_single_pptd(doc=doc, pptd=pptd)

    return pptds


def generate_automatic_span_annotations_pipeline(pptds: List[PreProTextDoc],
                                                 nlp: Dict[str, Language]) -> List[PreProTextDoc]:
    logger.info(f"Generating Automatic Span Annotations in spaCy Pipeline Mode for {len(pptds)} Documents...")

    # Flo: first we have to sort the PreProTextDoc by language and extract the text from the pptds that we want to
    #  use with the models
    pptds_data: Dict[str, List[Tuple[str, PreProTextDoc]]] = {lang: [] for lang in nlp.keys()}
    for pptd in pptds:
        pptd_lang = pptd.metadata["language"] if pptd.metadata["language"] in nlp else "default"
        pptds_data[pptd_lang].append((pptd.raw_text, pptd))

    # Flo: now apply language specific model in pipeline mode
    for (lang, model) in nlp.items():
        for doc, pptd in tqdm(model.pipe(pptds_data[lang], as_tuples=True), total=len(pptds_data[lang]),
                              desc="Generating Automatic Span Annotations in spaCy Pipeline Mode... "):
            generate_automatic_span_annotations_single_pptd(doc=doc, pptd=pptd)

    return pptds
