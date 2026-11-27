# Guard tests

A guard test checks a rule over the whole code base instead of one feature: it walks every route, every CRUD read or every table, so a mistake anywhere, also in code written later, makes it fail. When one fails, the message names the route, read or file that breaks the rule.

The twin idea: a second project whose rows have the same ids as the first one; every read must answer as before, so a query that matches a row by its id alone, without its project, shows up as a difference.

| Test file                                 | What it guards                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test_rest_rules.py`                      | The REST rules of every route: one body DTO and query parameters only on reads, no body on a `GET`, the tag of the first path segment, no tag on a route, one router per endpoint file.                                               |
| `test_project_isolation_of_routes.py`     | Every project route: only the known routes live outside projects, every route is covered by the tables, a non-member is rejected, an id of another project answers 404 in the path and 409 in a body and matches nothing as a filter. |
| `test_same_ids_in_two_projects_routes.py` | Every read route answers the same after a twin project with the same ids exists.                                                                                                                                                      |
| `test_same_ids_in_two_projects_crud.py`   | Every CRUD read, relationship and service query answers the same after a twin project with the same ids exists.                                                                                                                       |
| `test_composite_keys.py`                  | The composite foreign keys: a reference into another project is rejected, a read by id stays in its project.                                                                                                                          |

A new route or CRUD read must be added to the tables these tests check (`PATH_IDS`, `BODIES`, `QUERIES`, `ARGUMENTS`, `PARAMETERS`); the test that misses it says so.
