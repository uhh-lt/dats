---
applyTo: "backend/test/**/*.py"
---

# Backend Testing

Backend tests use **pytest** with FastAPI's `TestClient`. Tests are endpoint tests: they call real HTTP endpoints against a real (test) database.

## Running Tests

```bash
cd backend
pytest                          # all tests
pytest test/endpoints/search    # one folder
pytest test/endpoints/search/test_search_endpoint_memo.py  # one file
pytest -k memo_info             # by test name
```

Tests are configured in [pyproject.toml](backend/pyproject.toml) (`testpaths = ["test"]`, `pythonpath = "src"`).

## Test Layout

- Tests live under `backend/test/`. Endpoint tests live under `backend/test/endpoints/`.
- **One folder per endpoint group** (e.g. `endpoints/search/`, `endpoints/memo/`).
- **One test file per endpoint** (most of the time), named `test_<group>_endpoint_<name>.py` (e.g. `test_search_endpoint_memo.py`).
- **Each folder has its own `conftest.py`** with the fixtures its tests need.

## conftest.py Responsibilities

There are two levels of conftest:

**Root `backend/test/conftest.py`** — global infrastructure, mostly `autouse`:

- Points the app at test databases (env vars for Postgres, Weaviate, ES, Redis, filesystem).
- Starts a background worker (session scope).
- Drops and recreates the Postgres database (session scope).
- Re-initializes repos, Weaviate collections, and system users **on function scope** — every test gets a clean database.
- Provides `db_session`, `app`, `client`, `test_user`, `test_project`, `project_with_sdoc`.

**Folder `conftest.py`** (e.g. `endpoints/search/conftest.py`) — test data:

- Builds a **deterministic test project** (users, documents, codes, annotations, memos, ...) with fixed names and contents, so every test has a known expected result.
- Returns the created objects (e.g. as a `TypedDict`) so tests can read ids and attributes.
- A project fixture **may be shared** by many tests in the folder. If a test needs a special setup, define **another project fixture** in the same conftest — even one fixture per test is fine.
- Document the fixture's contents (the project setup) in the docstring of the fixture (what objects, which user authored them, etc).

**Never do project setup inside a test function.** All data setup belongs in conftest fixtures.

## Writing a Test

Each test function:

1. Has a **speaking name** that states exactly what is tested, e.g. `test_memo_search_title_column_supports_string_filter_operators`.
2. Has a **short docstring**: what is tested, plus any non-obvious detail. Longer rationale belongs here, not in comments.
3. **Tests one endpoint at a time.**
4. Follows this shape:
   - Extract what you need from the fixture (ids, dates, ...).
   - Build the request, **using the real DTOs** where possible (e.g. `QueryRequest[MemoColumns](...)`).
   - Send the request via `client`.
   - Parse the response, **into the response DTO** where possible (e.g. `Page[MemoRow].model_validate(response.json())`).
   - Assert. Assertions **may call other endpoints** to confirm the endpoint under test did the right thing.
5. Asserts status codes with the response body for context: `assert response.status_code == 200, response.text`.

Use `@pytest.mark.parametrize` for operator/column matrices. Give **every `pytest.param` a short comment** explaining the case, and a speaking `id`:

```python
@pytest.mark.parametrize(
    "operator,value,expected_titles",
    [
        # No memo is favorited -> EQUALS False matches all, True matches none.
        pytest.param(BooleanOperator.EQUALS, False, ALL_MEMOS, id="equals-false"),
        pytest.param(BooleanOperator.EQUALS, True, set(), id="equals-true"),
    ],
)
```

## Test Coverage

Aim to cover the full input space of an endpoint, not just the happy path:

- **Happy path**: the normal request succeeds and returns the expected data.
- **All input variants**: every column, every operator of each column's family, every enum value, and meaningful combinations (e.g. AND/OR logic, filter + search query, group_by + filter). Use `parametrize` to keep this compact.
- **Boundary conditions**: empty results, pagination across pages, single vs. multiple matches.
- **Invalid input**: wrong-typed values, malformed values, operator/column mismatches, missing or contradictory parameters. Assert the expected error status (400/422/500/...) and match on the error message.
- **Edge cases**: nonexistent ids or keys, deprecated values, empty fixtures states (e.g. no favorites).

Because the fixture data is deterministic, every one of these cases has a known expected result — assert exact results, not just status codes.

## Test File Organization

Organize each test file with comment blocks, from coarse to fine:

1. **One big block per endpoint**:

```python
# ===========================================================================
# SEARCH MEMO (/search/memo) TESTS
# ===========================================================================
```

2. **One small block per semantic section** within an endpoint (when there is more than one), with a short comment explaining the section:

```python
# --- B. invalid filter input (HTTP 400 contracts) ----------------------------------
# Two kinds of malformed filter input, both surfaced as HTTP 400: ...
```

3. **Per-test detail goes in the test's docstring**, not in standalone comments.

Shared helpers (e.g. `_post_memo_query`) go directly after the endpoint block header, before the sections. Shared constants (expected titles, mappings) go at the top of the file after imports.

**Reference**: [test_search_endpoint_memo.py](backend/test/endpoints/search/test_search_endpoint_memo.py)
