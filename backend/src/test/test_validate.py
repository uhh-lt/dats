import pytest

from api.validation import InvalidError, validate_condition


def test_assert_condition():
    validate_condition(True, "")

    with pytest.raises(InvalidError):
        validate_condition(False, "")
