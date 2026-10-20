import importlib.util
import textwrap
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_orm.py"
_spec = importlib.util.spec_from_file_location("check_orm", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_orm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_orm)

VALID_ORM = """
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.code.code_dto import CodeKind
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


class CodeORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    kind: Mapped[CodeKind] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="codes")

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="SET NULL"), index=True
    )
    parent: Mapped["CodeORM | None"] = relationship(
        "CodeORM", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["CodeORM"]] = relationship(
        "CodeORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="UC_code_name_unique_per_project"),
        CheckConstraint("length(name) > 0", name="CC_code_name_not_empty"),
    )

    def get_project_id(self) -> int:
        return self.project_id
"""


# ===========================================================================
# CHECK_ORM RULES
# ===========================================================================


def run(source: str, filename: str = "code_orm.py") -> list:
    return check_orm.check_source(Path(filename), textwrap.dedent(source))


def rules(source: str, filename: str = "code_orm.py") -> set[str]:
    return {v.rule for v in run(source, filename)}


# --- A. valid ORM -------------------------------------------------------------


def test_check_orm_accepts_valid_orm() -> None:
    """An ORM following all conventions yields no violations."""
    assert run(VALID_ORM) == []


# --- B. one failing example per rule ----------------------------------------
# Each case replaces one snippet of VALID_ORM and must trigger exactly its rule.


@pytest.mark.parametrize(
    ("rule", "old", "new"),
    [
        # column without a Mapped[...] annotation
        pytest.param(
            "typed-mapping",
            "    name: Mapped[str] = mapped_column(",
            "    name = mapped_column(",
            id="typed-mapping-column",
        ),
        # relationship annotated with a plain type
        pytest.param(
            "typed-mapping",
            'project: Mapped["ProjectORM"] = relationship(',
            'project: "ProjectORM" = relationship(',
            id="typed-mapping-relationship",
        ),
        # explicit table name
        pytest.param(
            "no-tablename",
            "class CodeORM(ORMBase):\n",
            'class CodeORM(ORMBase):\n    __tablename__ = "code"\n',
            id="no-tablename",
        ),
        # legacy Column(...) outside mapped_column
        pytest.param(
            "no-column",
            "    def get_project_id(self) -> int:",
            "    legacy = Column(Integer)\n\n    def get_project_id(self) -> int:",
            id="no-column",
        ),
        # optional column declared with nullable=True on a non-optional annotation
        pytest.param(
            "nullable",
            "description: Mapped[str | None] = mapped_column(String)",
            "description: Mapped[str] = mapped_column(String, nullable=True)",
            id="nullable-true",
        ),
        # redundant nullable=True on an optional annotation
        pytest.param(
            "nullable",
            "description: Mapped[str | None] = mapped_column(String)",
            "description: Mapped[str | None] = mapped_column(String, nullable=True)",
            id="nullable-redundant",
        ),
        # nullable=False contradicts the optional annotation
        pytest.param(
            "nullable",
            "description: Mapped[str | None] = mapped_column(String)",
            "description: Mapped[str | None] = mapped_column(String, nullable=False)",
            id="nullable-contradiction",
        ),
        # foreign key without ondelete
        pytest.param(
            "fk-ondelete",
            'ForeignKey("project.id", ondelete="CASCADE")',
            'ForeignKey("project.id")',
            id="fk-ondelete-missing",
        ),
        # SET NULL on a required column
        pytest.param(
            "fk-ondelete",
            'ForeignKey("project.id", ondelete="CASCADE")',
            'ForeignKey("project.id", ondelete="SET NULL")',
            id="fk-ondelete-set-null-required",
        ),
        # foreign key column without index
        pytest.param(
            "fk-index",
            'ForeignKey("code.id", ondelete="SET NULL"), index=True',
            'ForeignKey("code.id", ondelete="SET NULL")',
            id="fk-index",
        ),
        # naive DateTime()
        pytest.param(
            "tz-datetime",
            "DateTime(timezone=True), server_default",
            "DateTime(), server_default",
            id="tz-datetime-call",
        ),
        # bare DateTime type
        pytest.param(
            "tz-datetime",
            "DateTime(timezone=True), server_default",
            "DateTime, server_default",
            id="tz-datetime-bare",
        ),
        # native enum column type
        pytest.param(
            "no-native-enum",
            "kind: Mapped[CodeKind] = mapped_column(String,",
            "kind: Mapped[CodeKind] = mapped_column(Enum(CodeKind),",
            id="no-native-enum",
        ),
        # backref keyword
        pytest.param(
            "no-backref",
            'relationship("ProjectORM", back_populates="codes")',
            'relationship("ProjectORM", backref="codes")',
            id="no-backref-keyword",
        ),
        # backref() helper
        pytest.param(
            "no-backref",
            'relationship("ProjectORM", back_populates="codes")',
            'relationship("ProjectORM", foreign_keys=backref("codes"))',
            id="no-backref-call",
        ),
        # unique constraint without the UC_ prefix
        pytest.param(
            "constraint-name",
            'name="UC_code_name_unique_per_project"',
            'name="code_name_unique_per_project"',
            id="constraint-name-unique",
        ),
        # check constraint without a name
        pytest.param(
            "constraint-name",
            ', name="CC_code_name_not_empty"',
            "",
            id="constraint-name-check",
        ),
        # related ORM imported at runtime
        pytest.param(
            "type-checking-import",
            "from repos.db.orm_base import ORMBase\n",
            "from core.tag.tag_orm import TagORM\nfrom repos.db.orm_base import ORMBase\n",
            id="type-checking-import",
        ),
        # CRUD imported into an ORM
        pytest.param(
            "runtime-import",
            "from repos.db.orm_base import ORMBase\n",
            "from core.code.code_crud import crud_code\nfrom repos.db.orm_base import ORMBase\n",
            id="runtime-import-crud",
        ),
        # repo imported into an ORM
        pytest.param(
            "runtime-import",
            "from repos.db.orm_base import ORMBase\n",
            "from repos.db.orm_base import ORMBase\nfrom repos.redis_repo import RedisRepo\n",
            id="runtime-import-repo",
        ),
    ],
)
def test_check_orm_reports_exactly_the_violated_rule(
    rule: str, old: str, new: str
) -> None:
    """Breaking one convention of a valid ORM reports that rule and no other."""
    assert old in VALID_ORM
    source = VALID_ORM.replace(old, new, 1)
    assert rules(source) == {rule}


# --- C. output and CLI ----------------------------------------------------------


def test_check_orm_accepts_optional_string_annotation_and_link_table() -> None:
    """`Mapped["T | None"]` counts as optional, and a link table with a composite key passes."""
    source = (
        VALID_ORM.replace(
            "description: Mapped[str | None]", 'description: Mapped["str | None"]'
        )
        + """

class CodeTagLinkTable(ORMBase):
    code_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True, index=True
    )
"""
    )
    assert run(source) == []


def test_check_orm_violation_names_file_class_attribute_and_rule() -> None:
    """The printed violation contains file, line, rule, class and attribute."""
    source = VALID_ORM.replace(
        'ForeignKey("project.id", ondelete="CASCADE")', 'ForeignKey("project.id")'
    )
    (violation,) = run(source)
    assert str(violation).startswith("code_orm.py:")
    assert "[fk-ondelete] CodeORM.project_id:" in str(violation)


def test_check_orm_main_checks_only_orm_files(tmp_path: Path) -> None:
    """Files passed on the command line that are no ORM files are ignored; ORM files are checked."""
    other = tmp_path / "code_service.py"
    other.write_text("x = Column(Integer)\n")
    assert check_orm.main([str(other)]) == 0

    bad = tmp_path / "code_orm.py"
    bad.write_text(
        textwrap.dedent(VALID_ORM).replace("DateTime(timezone=True)", "DateTime")
    )
    assert check_orm.main([str(bad)]) == 1
