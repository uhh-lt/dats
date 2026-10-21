import ast
import importlib.util
import textwrap
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_dtos.py"
_spec = importlib.util.spec_from_file_location("check_dtos", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_dtos = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_dtos)

VALID_DTO = """
from datetime import datetime
from enum import Enum, IntEnum
from typing import TYPE_CHECKING, ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase

if TYPE_CHECKING:
    from core.code.code_orm import CodeORM


class CodeType(str, Enum):
    NORMAL = "normal"


class CodePriority(IntEnum):
    LOW = 0


# Properties shared across all DTOs
class CodeBaseDTO(BaseModel):
    name: str = Field(description="Name of the Code")
    MAX_DEPTH: ClassVar[int] = 10
    _cache: dict[int, str] = {}


# Properties for updating
class CodeUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(description="Name of the Code", default=None)


class CodeUpdateBulk(CodeUpdate):
    code_id: int = Field(description="ID of the Code to update")


# Properties for reading (as in ORM)
class CodeRead(CodeBaseDTO):
    id: int = Field(description="ID of the Code")
    created: datetime = Field(description="Created timestamp of the Code")
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_obj(cls, code: "CodeORM") -> "CodeRead":
        return cls.model_validate(code)


class CodeJobParams(BaseModel):
    code_job_type: Literal[CodeType.NORMAL] = Field(description="Type of the CodeJob")


class CodeJobInput(BaseModel):
    parameters: CodeJobParams = Field(
        description="Parameters of the CodeJob", discriminator="code_job_type"
    )
"""

ORM_ENTITIES = {"Code"}


def run(source: str, index=None) -> list:
    if index is None:
        index = check_dtos.Index(orm_entities=set(ORM_ENTITIES))
    return check_dtos.check_source(Path("code_dto.py"), textwrap.dedent(source), index)


def rules(source: str, index=None) -> set[str]:
    return {v.rule for v in run(source, index)}


def index_of(*sources: str):
    index = check_dtos.Index(orm_entities=set(ORM_ENTITIES))
    for source in sources:
        index.add_module(ast.parse(textwrap.dedent(source)))
    return index


# ===========================================================================
# CHECK_DTOS RULES
# ===========================================================================

# --- A. valid DTO module -----------------------------------------------------


def test_check_dtos_accepts_valid_dto_module() -> None:
    """A DTO module following all conventions yields no violations."""
    assert run(VALID_DTO) == []


# --- B. one failing example per rule -----------------------------------------
# Each case replaces one snippet of VALID_DTO and must trigger exactly its rule.


@pytest.mark.parametrize(
    ("rule", "old", "new"),
    [
        # ORM import outside of TYPE_CHECKING
        pytest.param(
            "forbidden-import",
            "if TYPE_CHECKING:\n    from core.code.code_orm import CodeORM",
            "from core.code.code_orm import CodeORM",
            id="import-orm",
        ),
        # CRUD module imported as a name
        pytest.param(
            "forbidden-import",
            "from repos.db.dto_base import UpdateDTOBase",
            "from repos.db.dto_base import UpdateDTOBase\nfrom core.code import code_crud",
            id="import-crud-module",
        ),
        # service import inside a method is a runtime import, too
        pytest.param(
            "forbidden-import",
            "        return cls.model_validate(code)",
            "        from core.code.code_service import CodeService\n"
            "        return cls.model_validate(code)",
            id="import-service-local",
        ),
        # bare annotation
        pytest.param(
            "field-description",
            'name: str = Field(description="Name of the Code")',
            "name: str",
            id="field-bare",
        ),
        # plain default instead of Field
        pytest.param(
            "field-description",
            'name: str | None = Field(description="Name of the Code", default=None)',
            "name: str | None = None",
            id="field-plain-default",
        ),
        # Field without description
        pytest.param(
            "field-description",
            'id: int = Field(description="ID of the Code")',
            "id: int = Field(ge=0)",
            id="field-no-description",
        ),
        # empty description
        pytest.param(
            "field-description",
            'id: int = Field(description="ID of the Code")',
            'id: int = Field(description="")',
            id="field-empty-description",
        ),
        # pydantic v1 config class
        pytest.param(
            "no-class-config",
            "    model_config = ConfigDict(from_attributes=True)\n",
            "    model_config = ConfigDict(from_attributes=True)\n\n"
            "    class Config:\n        orm_mode = True\n",
            id="class-config",
        ),
        # typing.Optional import
        pytest.param(
            "modern-typing",
            "from typing import TYPE_CHECKING, ClassVar, Literal",
            "from typing import TYPE_CHECKING, ClassVar, Literal, Optional",
            id="typing-import",
        ),
        # typing.List attribute
        pytest.param(
            "modern-typing",
            "    created: datetime =",
            "    tags: typing.List[int] = Field(description='Tags of the Code')\n"
            "    created: datetime =",
            id="typing-attribute",
        ),
        # Update DTO without UpdateDTOBase (CodeUpdateBulk inherits the violation)
        pytest.param(
            "update-base",
            "class CodeUpdate(BaseModel, UpdateDTOBase):",
            "class CodeUpdate(BaseModel):",
            id="update-without-base",
        ),
        # non-update DTO with UpdateDTOBase
        pytest.param(
            "update-base",
            "class CodeJobParams(BaseModel):",
            "class CodeJobParams(BaseModel, UpdateDTOBase):",
            id="base-on-non-update",
        ),
        # Read DTO of an ORM without from_attributes
        pytest.param(
            "read-from-attributes",
            "    model_config = ConfigDict(from_attributes=True)\n",
            "",
            id="read-without-from-attributes",
        ),
        # discriminator tag with a default
        pytest.param(
            "discriminator-tag",
            'Field(description="Type of the CodeJob")',
            'Field(description="Type of the CodeJob", default=CodeType.NORMAL)',
            id="tag-default",
        ),
        # exception class in a DTO module
        pytest.param(
            "no-exception",
            "class CodeJobParams(BaseModel):",
            "class CodeNotFoundError(Exception):\n    pass\n\n\nclass CodeJobParams(BaseModel):",
            id="exception",
        ),
    ],
)
def test_check_dtos_reports_exactly_the_violated_rule(
    rule: str, old: str, new: str
) -> None:
    """Breaking one convention of a valid DTO module reports that rule and no other."""
    assert old in VALID_DTO
    source = VALID_DTO.replace(old, new, 1)
    assert rules(source) == {rule}


# --- C. base resolution, output and CLI --------------------------------------


def test_check_dtos_resolves_bases_from_other_modules() -> None:
    """UpdateDTOBase and from_attributes are inherited from classes in other DTO modules."""
    other = """
    class AnnotationUpdate(BaseModel, UpdateDTOBase):
        pass

    class AnnotationReadBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
    """
    source = """
    class CodeUpdate(AnnotationUpdate):
        pass

    class CodeRead(AnnotationReadBase):
        pass
    """
    assert rules(source, index_of()) == {"update-base", "read-from-attributes"}
    assert rules(source, index_of(other)) == set()


def test_check_dtos_read_dto_may_opt_out_of_from_attributes() -> None:
    """A Read DTO that is not built from its ORM states from_attributes=False explicitly."""
    source = VALID_DTO.replace(
        "ConfigDict(from_attributes=True)", "ConfigDict(from_attributes=False)"
    )
    assert rules(source) == set()


def test_check_dtos_read_dto_without_orm_needs_no_from_attributes() -> None:
    """Only `<Entity>Read` classes with an `<Entity>ORM` need from_attributes."""
    source = VALID_DTO.replace(
        "    model_config = ConfigDict(from_attributes=True)\n", ""
    )
    assert rules(source, check_dtos.Index()) == set()


def test_check_dtos_violation_names_file_class_field_and_rule() -> None:
    """The printed violation contains file, line, rule, class and field."""
    source = VALID_DTO.replace(
        'id: int = Field(description="ID of the Code")', "id: int"
    )
    (violation,) = run(source)
    assert str(violation).startswith("code_dto.py:")
    assert "[field-description] CodeRead.id:" in str(violation)


def test_check_dtos_main_checks_only_dto_files(tmp_path: Path) -> None:
    """Files passed on the command line that are no DTO files are ignored; DTO files are checked."""
    other = tmp_path / "code_service.py"
    other.write_text("from core.code.code_orm import CodeORM\n")
    assert check_dtos.main([str(other)]) == 0

    bad = tmp_path / "code_dto.py"
    bad.write_text(
        textwrap.dedent(VALID_DTO).replace(
            "class CodeUpdate(BaseModel, UpdateDTOBase):",
            "class CodeUpdate(BaseModel):",
        ),
    )
    assert check_dtos.main([str(bad)]) == 1


def test_check_dtos_help_lists_every_rule(capsys: pytest.CaptureFixture[str]) -> None:
    """--help prints the rule list."""
    assert check_dtos.main(["--help"]) == 0
    out = capsys.readouterr().out
    for rule in [
        "forbidden-import",
        "field-description",
        "no-class-config",
        "modern-typing",
        "update-base",
        "read-from-attributes",
        "discriminator-tag",
        "no-exception",
    ]:
        assert rule in out
