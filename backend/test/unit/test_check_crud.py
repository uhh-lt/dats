import importlib.util
import textwrap
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_crud.py"
_spec = importlib.util.spec_from_file_location("check_crud", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_crud = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_crud)

VALID_SQL = """
class CRUDCode(SQLCRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    ### CREATE OPERATIONS ###

    def create_system_codes(self, db: Session, *, project_id: int) -> list[CodeORM]:
        return []

    ### READ OPERATIONS ###

    def read_by_name(self, db: Session, *, name: str) -> CodeORM | None:
        return None

    ### UPDATE OPERATIONS ###

    def update_color(self, db: Session, *, code_id: int, color: str) -> CodeORM:
        return self._helper(db)

    ### DELETE OPERATIONS ###

    def delete_by_project(self, db: Session, *, project_id: int) -> list[int]:
        return []

    ### OTHER OPERATIONS ###

    def exists_by_name(self, db: Session, *, name: str) -> bool:
        return False

    def count_by_project(self, db: Session, *, project_id: int) -> int:
        return 0

    def _helper(self, db: Session) -> CodeORM:
        db.flush()
        return CodeORM()


crud_code = CRUDCode(CodeORM)
"""

VALID_EMBEDDING = """
class CRUDSentenceEmbedding(EmbeddingCRUDBase[SentenceId, SentenceCollection]):
    ### READ OPERATIONS ###

    def read_embeddings_by_sdoc(self, client: WeaviateClient, *, sdoc_id: int) -> list[list[float]]:
        return []

    ### OTHER OPERATIONS ###

    def search_near_sentence(self, client: WeaviateClient, *, sentence_id: int, k: int) -> list[SimSearchResult]:
        return []


crud_sentence_embedding = CRUDSentenceEmbedding(collection_class=SentenceCollection)
"""

VALID_ELASTIC = """
class CRUDSdocElastic(ElasticCRUDBase[SdocIndex, ElasticSdoc]):
    ### OTHER OPERATIONS ###

    def search_by_content(self, client: Elasticsearch, *, project_id: int, query: str) -> list[ElasticSdoc]:
        return []


crud_sdoc_elastic = CRUDSdocElastic(index=SdocIndex, model=ElasticSdoc)
"""


# ===========================================================================
# CHECK_CRUD RULES
# ===========================================================================


def run(source: str, filename: str = "code_crud.py") -> list:
    return check_crud.check_source(Path(filename), textwrap.dedent(source))


def rules(source: str, filename: str = "code_crud.py") -> set[str]:
    return {v.rule for v in run(source, filename)}


# --- A. valid CRUDs ---------------------------------------------------------


@pytest.mark.parametrize(
    ("source", "filename"),
    [
        # SQL CRUD: db first, all five sections, a private helper
        pytest.param(VALID_SQL, "code_crud.py", id="sql"),
        # embedding CRUD: client first, EmbeddingCRUDBase
        pytest.param(VALID_EMBEDDING, "sentence_embedding_crud.py", id="embedding"),
        # elastic CRUD: client first, ElasticCRUDBase
        pytest.param(VALID_ELASTIC, "sdoc_elastic_crud.py", id="elastic"),
    ],
)
def test_check_crud_accepts_valid_crud_of_each_kind(source: str, filename: str) -> None:
    """A CRUD following all conventions yields no violations."""
    assert run(source, filename) == []


# --- B. one failing example per rule ----------------------------------------
# Each case replaces one snippet of VALID_SQL and must trigger exactly its rule.


@pytest.mark.parametrize(
    ("rule", "old", "new"),
    [
        # class not named CRUD<...>
        pytest.param(
            "crud-class", "class CRUDCode(", "class CodeCrud(", id="crud-class-missing"
        ),
        # a second CRUD class in the same file
        pytest.param(
            "crud-class",
            "crud_code = CRUDCode(CodeORM)",
            "crud_code = CRUDCode(CodeORM)\n\nclass CRUDOther(SQLCRUDBase):\n    pass",
            id="crud-class-two",
        ),
        # old base class name
        pytest.param("crud-base", "SQLCRUDBase[", "CRUDBase[", id="crud-base"),
        # singleton not named crud_<name>
        pytest.param(
            "singleton",
            "crud_code = CRUDCode(CodeORM)",
            "code_crud = CRUDCode(CodeORM)",
            id="singleton",
        ),
        # get_ is forbidden
        pytest.param(
            "method-verb", "def read_by_name(", "def get_by_name(", id="verb-get"
        ),
        # find_ is forbidden
        pytest.param(
            "method-verb", "def read_by_name(", "def find_by_name(", id="verb-find"
        ),
        # unknown verb
        pytest.param(
            "method-verb",
            "def count_by_project(",
            "def compute_by_project(",
            id="verb-unknown",
        ),
        # read method after the delete group
        pytest.param(
            "method-order",
            "    ### OTHER OPERATIONS ###\n",
            "    ### READ OPERATIONS ###\n\n    def read_late(self, db: Session) -> None:\n        pass\n\n"
            "    ### OTHER OPERATIONS ###\n",
            id="method-order",
        ),
        # update method without its section comment (sits below READ)
        pytest.param(
            "section-comment",
            "    ### UPDATE OPERATIONS ###\n",
            "",
            id="section-missing",
        ),
        # unknown section name
        pytest.param(
            "section-comment",
            "### OTHER OPERATIONS ###",
            "### MISC OPERATIONS ###",
            id="section-unknown",
        ),
        # db passed as keyword-only
        pytest.param(
            "first-param",
            "def read_by_name(self, db: Session, *,",
            "def read_by_name(self, *, db: Session,",
            id="first-param",
        ),
        # positional parameter after db
        pytest.param(
            "keyword-only",
            "def read_by_name(self, db: Session, *, name",
            "def read_by_name(self, db: Session, name",
            id="keyword-only",
        ),
        # public method without return annotation
        pytest.param(
            "return-annotation", "-> CodeORM | None:", ":", id="return-public"
        ),
        # private helper without return annotation
        pytest.param(
            "return-annotation",
            "def _helper(self, db: Session) -> CodeORM:",
            "def _helper(self, db: Session):",
            id="return-private",
        ),
        # commit inside the CRUD
        pytest.param("no-commit", "db.flush()", "db.commit()", id="commit"),
        # rollback inside the CRUD
        pytest.param("no-commit", "db.flush()", "db.rollback()", id="rollback"),
        # proj_id parameter
        pytest.param(
            "no-proj-id",
            "def _helper(self, db: Session)",
            "def _helper(self, db: Session, proj_id: int)",
            id="proj-id",
        ),
        # Read DTO in a union
        pytest.param(
            "no-read-dto", "-> CodeORM | None:", "-> CodeRead | None:", id="read-dto"
        ),
        # Read DTO as string annotation inside a generic
        pytest.param(
            "no-read-dto",
            "-> CodeORM | None:",
            '-> list["CodeRead"]:',
            id="read-dto-string",
        ),
    ],
)
def test_check_crud_reports_exactly_the_violated_rule(
    rule: str, old: str, new: str
) -> None:
    """Breaking one convention of a valid SQL CRUD reports that rule and no other."""
    assert old in VALID_SQL
    source = VALID_SQL.replace(old, new, 1)
    assert rules(source) == {rule}


# --- C. CRUD kinds, output and CLI --------------------------------------------


def test_check_crud_embedding_crud_requires_client_and_its_base() -> None:
    """Embedding CRUDs take `client`, and are only recognized by the *_embedding_crud.py suffix."""
    source = VALID_EMBEDDING.replace("client: WeaviateClient", "db: Session")
    assert rules(source, "sentence_embedding_crud.py") == {
        "first-param",
        "keyword-only",
    }
    assert rules(VALID_EMBEDDING, "sentence_crud.py") >= {"crud-base", "first-param"}


def test_check_crud_add_remove_verbs_are_sql_only() -> None:
    """SQL CRUDs may use add_/remove_ for association rows; embedding and elastic CRUDs may not."""
    sql = VALID_SQL.replace("def count_by_project(", "def remove_from_project(")
    assert rules(sql) == set()
    embedding = VALID_EMBEDDING.replace(
        "def search_near_sentence(", "def remove_by_sentence("
    )
    assert rules(embedding, "sentence_embedding_crud.py") == {"method-verb"}
    elastic = VALID_ELASTIC.replace("def search_by_content(", "def add_by_content(")
    assert rules(elastic, "sdoc_elastic_crud.py") == {"method-verb"}


def test_check_crud_elastic_crud_requires_its_base() -> None:
    """Elastic CRUDs must derive from ElasticCRUDBase, not another CRUD base."""
    source = VALID_ELASTIC.replace("ElasticCRUDBase", "EmbeddingCRUDBase")
    assert rules(source, "sdoc_elastic_crud.py") == {"crud-base"}


def test_check_crud_violation_names_file_class_method_and_rule() -> None:
    """The printed violation contains file, line, rule, class and method."""
    source = VALID_SQL.replace("def read_by_name(", "def get_by_name(")
    (violation,) = run(source)
    assert str(violation).startswith("code_crud.py:")
    assert "[method-verb] CRUDCode.get_by_name:" in str(violation)


def test_check_crud_main_checks_only_crud_files(tmp_path: Path) -> None:
    """Files passed on the command line that are no CRUD files are ignored; CRUD files are checked."""
    other = tmp_path / "code_service.py"
    other.write_text("def get_x(): pass\n")
    assert check_crud.main([str(other)]) == 0

    bad = tmp_path / "code_crud.py"
    bad.write_text(textwrap.dedent(VALID_SQL).replace("db.flush()", "db.commit()"))
    assert check_crud.main([str(bad)]) == 1
