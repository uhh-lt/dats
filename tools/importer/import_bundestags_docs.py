import json
import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dats_api import DATSAPI
from fire import Fire
from loguru import logger
from tqdm.auto import tqdm

# To get the URLs (one per search):
# 1. Use the expert search as usual on https://dip.bundestag.de/experten-suche
# 2. After you searched the documents, open the developer tools in your browser
# 3. Go to the network tab (maybe you have to reload the page)
# 4. Click on the GET request to the `search.dip.bundestag.de` API (should be the second last request using Firefox)
# 5. Copy the URL from the request. Make sure that the URL is url-encoded (no spaces, etc.)
DPI_PROTOKOLLE_SEARCH_URL = "https://search.dip.bundestag.de/search-api/v1/expert/search?term=%22Klimaprotest%20OR%20Klimastreik%20OR%20%22Energiewende%22%20OR%20%22Kohleausstieg%22%20OR%20%22CO2-Nutzung%22%20OR%20Klimaver%C3%A4nderung%20OR%20Klimawandel%20OR%20Klima%0Akrise%20OR%20Klimakatastrophe%20OR%20Klimanotstand%20OR%20Erderw%C3%A4rmung%20OR%20Verkehrswende%20OR%20Energiewende%20OR%20W%C3%A4rmewende%20OR%20Klimatransformation%20OR%20%22Green%20Deal%22%20OR%20Dekarbonisierung%20OR%20Kohleausstieg%20OR%20Tempolimit%20OR%20Geb%C3%A4udeenergiegesetz%20OR%20%22KSG%22%20OR%20Klimaschutzgesetz%20OR%20%22EU-ETS%22%20OR%20Klimaklage*%20OR%20Klimaprotest*%20OR%20Klimaaktivis*%20OR%20Klimastreik&f.herausgeber_dokumentart=Bundestag-Plenarprotokoll&f.vorgangstyp_p=02Debatten%20ohne%20Vorlage&f.vorgangstyp_p=02Debatten%20ohne%20Vorlage~Aktuelle%20Stunde&f.vorgangstyp_p=01Antr%C3%A4ge&f.datum.start=2015-01-01&f.datum.end=2025-02-28&rows=500&session=R3hq"
DPI_ANTRAEGE_SEARCH_URL = "https://search.dip.bundestag.de/search-api/v1/expert/search?term=%22Klimaprotest%20OR%20Klimastreik%20OR%20%22Energiewende%22%20OR%20%22Kohleausstieg%22%20OR%20%22CO2-Nutzung%22%20OR%20Klimaver%C3%A4nderung%20OR%20Klimawandel%20OR%20Klima%0Akrise%20OR%20Klimakatastrophe%20OR%20Klimanotstand%20OR%20Erderw%C3%A4rmung%20OR%20Verkehrswende%20OR%20Energiewende%20OR%20W%C3%A4rmewende%20OR%20Klimatransformation%20OR%20%22Green%20Deal%22%20OR%20Dekarbonisierung%20OR%20Kohleausstieg%20OR%20Tempolimit%20OR%20Geb%C3%A4udeenergiegesetz%20OR%20%22KSG%22%20OR%20Klimaschutzgesetz%20OR%20%22EU-ETS%22%20OR%20Klimaklage*%20OR%20Klimaprotest*%20OR%20Klimaaktivis*%20OR%20Klimastreik&f.herausgeber_dokumentart=Bundesrat-Plenarprotokoll&f.vorgangstyp_p=01Antr%C3%A4ge&f.drucksachetyp_p=01Antr%C3%A4ge&f.datum.start=2015-01-01&f.datum.end=2025-02-28&rows=500&session=R3hq"

# To get the headers:
# 1. After you searched the documents, open the developer tools in your browser
# 3. Go to the network tab (maybe you have to reload the page)
# 3. Click on the GET request to the `search.dip.bundestag.de` API (should be the second last request using Firefox)
# 4. Copy the RAW request headers from the request
# 5. Remove the GET and Host lines (should be the first two lines)
# 6. Paste the remaining headers here
DPI_SEARCH_HEADERS = """
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:136.0) Gecko/20100101 Firefox/136.0
Accept: */*
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br, zstd
Referer: https://dip.bundestag.de/
Origin: https://dip.bundestag.de
DNT: 1
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: same-site
Authorization: ApiKey SbGXhWA.3cpnNdb8rkht7iWpvSgTP8XIG88LoCrGd4
Connection: keep-alive
Sec-GPC: 1
Priority: u=4
TE: trailers
""".strip()


# THE KEYS MUST MATCH THE COLUMNS OF THE DOCUMENT METADATA DATAFRAME
PROJECT_METADATA = {
    "dokumentid": "STRING",
    "dokumentart": "STRING",
    "typ": "STRING",
    "vorgangstyp": "STRING",
    "aktivitaetsart": "STRING",
    "titel": "STRING",
    "pdf_url": "STRING",
    "datum": "DATE",
    "basisdatum": "DATE",
}

PROJECT_TAGS = {
    "Stenografischer Bericht",
    "Gesetzentwurf",
    "Schriftliche Fragen",
    "Antwort der Bundesregierung",
    "Gutachten",
    "Stellungnahme",
    "Unterrichtung",
    "Plenarprotokoll",
    "Kleine Anfrage",
    "Fragen für die Fragestunde",
    "Beschluss",
    "Entschließungsantrag",
}


def __random_hex_color():
    return "#" + "".join(random.choices("0123456789ABCDEF", k=6))


def __parse_raw_headers(raw_headers: str) -> dict[str, str]:
    headers = {}
    for line in raw_headers.strip().split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.strip()] = value.strip()
    return headers


def __fetch_with_headers(url: str, raw_headers: str) -> dict:
    logger.info(f"Fetching {url} ...")
    headers = __parse_raw_headers(raw_headers)
    response = requests.get(url, headers=headers)
    docs_json = json.loads(response.text)
    logger.info(f"Fetched {len(docs_json['documents'])} documents from {url}")
    return docs_json


def get_bundestag_docs_metadata(
    urls: list[str], headers: str, output_dir: Path
) -> pd.DataFrame:
    rows = []
    for url in urls:
        docs_json = __fetch_with_headers(url, headers)
        for document in docs_json["documents"]:
            row = None
            if "pdf_url" in document["fundstelle"]:
                row = {"pdf_url": document["fundstelle"]["pdf_url"]}
                if "xml_url" in document["fundstelle"]:
                    row["xml_url"] = document["fundstelle"]["xml_url"]
            elif isinstance(document["fundstelle"], list):
                for fundstelle in document["fundstelle"]:
                    if "pdf_url" in fundstelle and row is None:
                        row = {"pdf_url": fundstelle["pdf_url"]}
                        if "xml_url" in fundstelle:
                            row["xml_url"] = fundstelle["xml_url"]
                    elif "pdf_url" in fundstelle and row is not None:
                        logger.warning(
                            f"Multiple PDF URLs found for document {document['id']}"
                        )
            if row is None:
                logger.warning(f"No PDF URL found for document {document['id']}")
                continue
            row.update({k: v for k, v in document.items() if isinstance(v, str)})
            rows.append(row)

    # different document types have different keys, so we need to fill the missing keys
    keys = set()
    for row in rows:
        keys.update(row.keys())
    for row in rows:
        for key in keys:
            if key not in row:
                row[key] = "N/A"
    df = pd.DataFrame(rows)
    df = df.rename(columns={"id": "dokumentid"})
    if not output_dir.exists():
        output_dir.mkdir(parents=True)
    ofn = output_dir / "bundestags_documents.jsonl"
    df.to_json(ofn, orient="records", lines=True)
    logger.info(f"Saved Metadata of {len(df)} Bundestag documents to {ofn}")

    # we dont want to save the date (with datetime type) to the json file ...
    df["date"] = pd.to_datetime(df["datum"])
    return df


def download_docs(df: pd.DataFrame, output_dir: Path) -> pd.DataFrame:
    if not output_dir.exists():
        output_dir.mkdir(parents=True)
    pdfs = []
    xmls = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Downloading PDFs"):
        if "pdf_url" in row and row["pdf_url"] != "N/A":
            name = Path(row["pdf_url"]).name
            pdf_ofn = output_dir / "pdf" / name
            pdf_ofn.parent.mkdir(parents=True, exist_ok=True)
            if not pdf_ofn.exists():
                response = requests.get(row["pdf_url"])
                pdf_ofn.write_bytes(response.content)
            pdfs.append(pdf_ofn)
        else:
            pdfs.append(None)
        if "xml_url" in row and row["xml_url"] != "N/A":
            name = Path(row["xml_url"]).name
            xml_ofn = output_dir / "xml" / name
            xml_ofn.parent.mkdir(parents=True, exist_ok=True)
            if not xml_ofn.exists():
                response = requests.get(row["xml_url"])
                xml_ofn.write_text(response.text)
            xmls.append(xml_ofn)
        else:
            xmls.append(None)
    logger.info(f"Downloaded {len(df)} PDFs to {output_dir / 'pdf'}")
    logger.info(f"Downloaded {len(df)} XMLs to {output_dir / 'xml'}")
    df["pdf_path"] = list(map(str, pdfs))
    df["xml_path"] = list(map(str, xmls))
    df.to_json(output_dir / "bundestags_documents.jsonl", orient="records", lines=True)
    return df


def download_bundestag_docs(
    output_dir: str | Path = "../data/bundestag",
) -> pd.DataFrame:
    output_dir = Path(output_dir)
    if not output_dir.exists():
        output_dir.mkdir(parents=True)

    df = get_bundestag_docs_metadata(
        urls=[DPI_PROTOKOLLE_SEARCH_URL, DPI_ANTRAEGE_SEARCH_URL],
        headers=DPI_SEARCH_HEADERS,
        output_dir=output_dir,
    )
    df = download_docs(df=df, output_dir=output_dir)
    return df


def __init_api(backend_url: str, username: str, password: str) -> DATSAPI:
    api = DATSAPI(
        base_path=backend_url,
        username=username,
        password=password,
    )
    api.login()
    api.me()
    logger.info(f"Logged in to DATS instance {backend_url} as {username}!")

    return api


def __create_project_metadata_if_required(
    api: DATSAPI,
    project: dict,
) -> None:
    project_metadatas = api.read_all_project_metadata(proj_id=project["id"])
    project_metadatas = [
        metadata for metadata in project_metadatas if metadata["doctype"] == "text"
    ]
    project_metadatas = {meta["key"]: meta for meta in project_metadatas}

    for metadata_key, metadata_type in PROJECT_METADATA.items():
        if metadata_key not in project_metadatas:
            api.create_project_metadata(
                proj_id=project["id"],
                key=metadata_key,
                metatype=metadata_type,
                doctype="text",
                description=metadata_key,
            )
            logger.info(
                f"Created Project Metadata {metadata_key} and Type {metadata_type}!"
            )


def __create_project_tags_if_required(
    api: DATSAPI,
    project: dict,
    df: pd.DataFrame,
) -> None:
    api.refresh_login()
    for tag_name in PROJECT_TAGS:
        tag = api.get_tag_by_name(proj_id=project["id"], name=tag_name)
        if tag is None:
            tag = api.create_tag(
                name=tag_name,
                description=f"Documentenart: {tag_name}",
                color=__random_hex_color(),
                proj_id=project["id"],
            )
            logger.info(f"Created Tag {tag_name} with ID {tag['id']}!")


def __get_or_create_project(
    api: DATSAPI,
    project_id: int,
    df: pd.DataFrame,
) -> dict:
    api.refresh_login()
    oldest_date = df["date"].min().strftime("%Y-%m-%d")
    newest_date = df["date"].max().strftime("%Y-%m-%d")
    if project_id == -1 or (project := api.get_proj_by_id(project_id)) is None:
        title = "Klima Bundestags Debatten"
        project = api.get_proj_by_title(title)
        i = 2
        while project is not None:
            project = api.get_proj_by_title(title + f" {i}")
            i += 1
        project = api.create_project(
            title=title,
            description=f"Klima Bundestag Debatten from {oldest_date} to {newest_date}",
        )
        logger.info(f"Created Project {title} with ID {project['id']}!")

    __create_project_metadata_if_required(api=api, project=project)
    __create_project_tags_if_required(api=api, project=project, df=df)

    return project


def __read_documents_from_disk(
    df: pd.DataFrame,
) -> list[tuple[str, tuple[str, bytes, str]]]:
    # list[tuple(dict_key), tuple(name, content, mime)]
    files: list[tuple[str, tuple[str, bytes, str]]] = []
    if "pdf_path" not in df.columns:
        raise ValueError("PDF Path not in DataFrame!")

    pdf_mime = "application/pdf"
    for _, row in df.iterrows():
        pdf_path = row["pdf_path"]
        if pdf_path is None or not pdf_path.exists():
            logger.warning(f"PDF for Document {row['dokumentid']} not found!")
            continue
        with open(pdf_path, "rb") as file:
            files.append(("uploaded_files", (pdf_path.name, file.read(), pdf_mime)))

    return files


def __upload_documents(
    api: DATSAPI,
    project: dict,
    df: pd.DataFrame,
    batch_size: int = 10,
) -> pd.DataFrame:
    num_batches = np.ceil(len(df) / batch_size)
    batches: list[pd.DataFrame] = np.array_split(df, num_batches)  # type: ignore
    uploaded_sdoc_ids = []
    with tqdm(
        desc=f"Uploading Documents to Project{project['id']}", total=len(df)
    ) as pbar:
        for batch in batches:
            files = __read_documents_from_disk(df=batch)
            sdoc_ids = api.upload_file_batch(
                project_id=project["id"],
                file_batch=files,
                filter_duplicate_files_before_upload=True,
            )
            uploaded_sdoc_ids.extend(sdoc_ids)
            pbar.update(len(sdoc_ids))
            api.refresh_login()
    logger.info(
        f"Uploaded {len(uploaded_sdoc_ids)} Documents to Project {project['id']}!"
    )
    # map sdoc ids to the original documents
    api.refresh_login()
    fn2id = {}
    for _, row in df.iterrows():
        fn = Path(row["pdf_path"]).name
        sdoc_id = api.resolve_sdoc_id_from_proj_and_filename(
            proj_id=project["id"],
            filename=fn,
        )
        if sdoc_id is not None:
            fn2id[fn] = sdoc_id
    df["sdoc_id"] = df["pdf_path"].apply(lambda x: fn2id.get(Path(x).name, -1))
    return df


def __get_tags_of_sdoc(api: DATSAPI, sdoc_id: int) -> set[str]:
    # build the tag regex for all tags
    tag_regex = "|".join([t.replace(" ", r"\s+") for t in PROJECT_TAGS])
    sdoc_content = "\n".join(api.get_sdoc_data(sdoc_id=sdoc_id)["sentences"])
    found_tags = set(
        " ".join(t.split()) for t in set(re.findall(tag_regex, sdoc_content))
    )
    return found_tags


def __apply_tags_to_documents(api: DATSAPI, project: dict, df: pd.DataFrame) -> None:
    api.refresh_login()
    tagname2tagid = {}
    for tag_name in PROJECT_TAGS:
        tag = api.get_tag_by_name(proj_id=project["id"], name=tag_name)
        if tag is None:
            logger.warning(f"Tag {tag_name} not found in Project {project['id']}!")
            continue
        tagname2tagid[tag_name] = tag["id"]

    # get the tags for each sdoc. since a sdoc and have more than one tag and
    # for efficiency we, we group the sdocs by their tags and bulk apply the tags
    tagids2sdocids: dict[str, set[int]] = {}
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Getting Tags of SDocs"):
        sdoc_id = row["sdoc_id"]
        if sdoc_id == -1:
            continue
        found_tags = __get_tags_of_sdoc(api=api, sdoc_id=sdoc_id)
        # we need to stringify the tag ids to use them as dict keys
        tag_ids_str = ";".join(
            {str(tagname2tagid[t]) for t in found_tags if t in tagname2tagid}
        )
        if tag_ids_str not in tagids2sdocids:
            tagids2sdocids[tag_ids_str] = set()
        tagids2sdocids[tag_ids_str].add(sdoc_id)

    for tag_ids_str, sdoc_ids in tagids2sdocids.items():
        tag_ids = []
        for tag_id_str in tag_ids_str.split(";"):
            try:
                tag_ids.append(int(tag_id_str))
            except ValueError:
                logger.warning(f"Invalid Tag ID {tag_id_str}!")
                continue
        api.bulk_apply_tags(
            tag_ids=tag_ids,
            sdoc_ids=list(sdoc_ids),
        )

    logger.info(f"Applied Tags to {len(df)} Documents in Project {project['id']}!")


def __apply_metadata_to_documents(
    api: DATSAPI, project: dict, df: pd.DataFrame
) -> None:
    api.refresh_login()
    for _, row in tqdm(
        df.iterrows(), total=len(df), desc="Applying Metadata to Documents"
    ):
        metadata = {k: str(v) for k, v in row.items()}
        sdoc_id = row["sdoc_id"]
        for metadata_key, metadata_type in PROJECT_METADATA.items():
            if metadata_key in metadata:
                api.update_sdoc_metadata(
                    sdoc_id=sdoc_id,
                    key=metadata_key,
                    metatype=metadata_type,
                    value=metadata[metadata_key],
                )
        logger.info(
            f"Applied Metadata to Document {sdoc_id} in Project {project['id']}!"
        )


def __apply_sdoc_names_to_documents(
    api: DATSAPI, project: dict, df: pd.DataFrame
) -> None:
    api.refresh_login()
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Setting Name to SDocs"):
        sdoc_id = row["sdoc_id"]
        name = row["titel"]
        api.set_sdoc_name(
            sdoc_id=sdoc_id,
            name=name,
        )
        logger.info(
            f"Set Name {name} to Document {sdoc_id} in Project {project['id']}!"
        )


def import_bundestag_docs(
    dats_backend_url: str,
    dats_username: str = "SYSTEM@dats.org",
    dats_password: str = "12SYSTEM34",
    project_id: int = -1,
    df_path: str
    | Path = "/ltstorage/shares/datasets/dats/bundestag/2025/bundestags_documents.jsonl",
    df: pd.DataFrame | None = None,
    test_run: bool = False,
) -> None:
    if dats_backend_url[-1] != "/":
        dats_backend_url += "/"
    if df is None:
        df_path = Path(df_path)
        if not df_path.exists():
            raise FileNotFoundError(
                f"Bundestag Document Metadata DataFrame at {df_path} does not exist!"
            )
        df = pd.read_json(df_path, lines=True)
        logger.info(
            f"Read Metadata DataFrame of {len(df)} Bundestag Documents from {df_path}"
        )
    df["pdf_path"] = df["pdf_path"].apply(lambda x: Path(x))  # type: ignore
    if test_run:
        df = df.sample(n=5, random_state=1337)
    logger.info(f"Importing {len(df)} Bundestag Documents to DATS ...")
    api = __init_api(dats_backend_url, dats_username, dats_password)
    project = __get_or_create_project(api=api, project_id=project_id, df=df)
    df = __upload_documents(api=api, project=project, df=df)
    __apply_sdoc_names_to_documents(api=api, project=project, df=df)
    __apply_tags_to_documents(api=api, project=project, df=df)
    __apply_metadata_to_documents(api=api, project=project, df=df)

    logger.info(f"Successfully imported {len(df)} Bundestag Documents!")
    logger.info(f"Project ID: {project['id']}")
    logger.info(f"Project Title: {project['title']}")


def download_and_import_bundestag_docs(
    dats_backend_url: str,
    dats_username: str = "SYSTEM@dats.org",
    dats_password: str = "12SYSTEM34",
    dats_project_id: int = -1,
    output_dir: str | Path = "/ltstorage/shares/datasets/dats/bundestag/2025",
    test_run: bool = False,
) -> None:
    if dats_backend_url[-1] != "/":
        dats_backend_url += "/"
    df = download_bundestag_docs(
        output_dir=output_dir,
    )
    import_bundestag_docs(
        dats_backend_url=dats_backend_url,
        dats_username=dats_username,
        dats_password=dats_password,
        project_id=dats_project_id,
        df=df,
        test_run=test_run,
    )


if __name__ == "__main__":
    Fire(
        {
            "full": download_and_import_bundestag_docs,
            "download": download_bundestag_docs,
            "import": import_bundestag_docs,
        }
    )
