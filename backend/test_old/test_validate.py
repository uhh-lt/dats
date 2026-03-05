import pytest

from core.auth.validation import InvalidError, Validate


def test_assert_condition(validate: Validate):
    validate.validate_condition(True, "")

    with pytest.raises(InvalidError):
        validate.validate_condition(False, "")
