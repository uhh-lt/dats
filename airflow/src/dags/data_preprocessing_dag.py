import pendulum
from airflow.sdk import dag, task


@dag(
    schedule=None,
    start_date=pendulum.datetime(2021, 1, 1, tz="UTC"),
    catchup=False,
    tags=["preprocessing"],
)
def data_processing_dag():
    """
    ### TaskFlow API Tutorial Documentation
    This is a simple data pipeline example which demonstrates the use of
    the TaskFlow API using three simple tasks for Extract, Transform, and Load.
    Documentation that goes along with the Airflow TaskFlow API tutorial is
    located
    [here](https://airflow.apache.org/docs/apache-airflow/stable/tutorial_taskflow_api.html)
    """

    # File handling
    @task.external_python(
        task_id="extract_archive", python="/dats_code/dats-venv/bin/python"
    )
    def extract_archive():
        from pathlib import Path

        from modules.doc_processing.archive_extraction_job import (
            ArchiveExtractionJobInput,
            extract_archive,
        )

        return extract_archive(
            ArchiveExtractionJobInput(
                project_id=1,
                filepath=Path("/path/to/archive.zip"),
            )
        )

    @task.external_python(
        task_id="doc_chunking", python="/dats_code/dats-venv/bin/python"
    )
    def doc_chunking():
        from pathlib import Path

        from modules.doc_processing.doc_chunking_job import (
            DocChunkingJobInput,
            doc_chunking,
        )

        return doc_chunking(
            DocChunkingJobInput(
                project_id=1,
                filename=Path("/path/to/document.pdf"),
                max_pages_per_chunk=5,
            )
        )

    @task.external_python(
        task_id="extract_html", python="/dats_code/dats-venv/bin/python"
    )
    def extract_html():
        from pathlib import Path

        from common.doc_type import DocType
        from modules.doc_text_processing.html_extraction_job import (
            ExtractHTMLJobInput,
            extract_html,
        )

        return extract_html(
            ExtractHTMLJobInput(
                project_id=1,
                sdoc_id=1,
                filepath=Path("/path/to/document.html"),
                doctype=DocType.text,
                folder_id=None,
            )
        )

    # HTML Processing

    @task.external_python(
        task_id="extract_plain_text", python="/dats_code/dats-venv/bin/python"
    )
    def extract_plain_text():
        from common.doc_type import DocType
        from modules.doc_text_processing.html_mapping_job import (
            ExtractPlainTextJobInput,
            extract_plain_text,
        )

        return extract_plain_text(
            ExtractPlainTextJobInput(
                project_id=1,
                sdoc_id=1,
                html="<html><body>Sample text</body></html>",
                filename="document.txt",
                doctype=DocType.text,
            )
        )

    @task.external_python(
        task_id="html_mapping", python="/dats_code/dats-venv/bin/python"
    )
    def html_mapping():
        from modules.doc_text_processing.html_mapping_job import (
            HTMLMappingJobInput,
            html_mapping,
        )

        return html_mapping(
            HTMLMappingJobInput(
                project_id=1,
                sdoc_id=1,
                raw_html="<html><body>Sample text</body></html>",
                sentence_starts=[0],
                sentence_ends=[5],
                token_starts=[0],
                token_ends=[5],
            )
        )

    @task.external_python(
        task_id="detect_language", python="/dats_code/dats-venv/bin/python"
    )
    def detect_language():
        from common.doc_type import DocType
        from modules.doc_text_processing.detect_language_job import (
            DetectLanguageJobInput,
            detect_language,
        )

        return detect_language(
            DetectLanguageJobInput(
                project_id=1,
                sdoc_id=1,
                doctype=DocType.text,
                html="<html><body>Sample text</body></html>",
                text="Sample text",
            )
        )

    @task.external_python(task_id="spacy", python="/dats_code/dats-venv/bin/python")
    def spacy():
        from common.doc_type import DocType
        from modules.doc_text_processing.spacy_job import (
            SpacyJobInput,
            spacy,
        )

        return spacy(
            SpacyJobInput(
                project_id=1,
                sdoc_id=1,
                doctype=DocType.text,
                text="Sample text",
                language="en",
                html="<html><body>Sample text</body></html>",
            )
        )

    @task.external_python(task_id="es_index", python="/dats_code/dats-venv/bin/python")
    def es_index():
        from modules.doc_text_processing.es_index_job import (
            ESIndexJobInput,
            es_index,
        )

        return es_index(
            ESIndexJobInput(
                project_id=1,
                sdoc_id=1,
                filename="document.txt",
                text="Sample text",
            )
        )

    @task.external_python(
        task_id="sentence_embedding", python="/dats_code/dats-venv/bin/python"
    )
    def sentence_embedding():
        from modules.doc_text_processing.sentence_embedding_job import (
            SentenceEmbeddingJobInput,
            sentence_embedding,
        )

        return sentence_embedding(
            SentenceEmbeddingJobInput(
                project_id=1, sdoc_id=1, sentences=["Sample text"]
            )
        )


data_processing_dag()
