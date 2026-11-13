# ADR 0001: Test Suite Architecture and Database Isolation Strategy

**Date:** 2026-06-11

## Context and Problem Statement

Our application is a complex, multi-tenant distributed backend. A "Project" in our system is not just a Postgres row; it represents a complete tenant ecosystem that spans multiple databases, including Postgres, Elasticsearch (Search), Weaviate (Vector DB), and a local Filesystem.

We needed to define a standardized testing architecture to solve transaction isolation bugs (flushed vs. committed data) and reduce the massive amount of "setup noise" required in our test files, while ensuring 100% data consistency across all storage systems.

## Options Considered

1. **Hand-rolled "Smart" Factories:** Writing complex factory classes that automatically resolve their own dependencies (e.g., a Folder factory automatically building a Project).
2. **factory_boy + Nested Transactions:** Using the industry-standard library to generate data and relying on Pytest nested transactions (savepoints) to isolate test data.
3. **Pytest Fixtures + "Dumb" CRUD/Service Wrappers + "Nuke & Restart":** Using Pytest fixtures to build dependency graphs, relying on our actual production services to build infrastructure, and resetting all databases entirely between tests.

## Decision

We chose **Option 3: Pytest Fixtures + "Dumb" CRUD/Service Wrappers + "Nuke & Restart"**.

We explicitly reject the use of factory_boy and Nested Transactions for our architecture.

## Rationale

- **The Distributed Database Limitation:** Nested transactions (savepoints) only work for ACID-compliant relational databases like Postgres. Elasticsearch, Weaviate, and the Filesystem do not support rollbacks. If a test fails or rolls back, Postgres would be clean, but our vector and search databases would retain "ghost" data, leading to severe test flakiness and desync issues.
- **Service Reuse over Logic Duplication:** Setting up a Project requires heavy infrastructure orchestration (tenant creation, index creation). Standard factories bypass this business logic. By wrapping our actual ProjectService in a fixture, we guarantee our tests run in an infrastructure environment that perfectly mirrors production.
- **Test Signal vs. Noise:** For "leaf" nodes (Memos, Codes, Annotations), we will use explicit Pytest fixtures for common setups, and call our CRUD classes directly. This removes the need to maintain a redundant layer of factory classes while keeping tests readable and explicit.
- **Data Guarantee:** The "Nuke & Restart" strategy (dropping/truncating all data across all DBs between tests) guarantees a pristine vacuum for every test. Absolute certainty in data integrity is worth the slight trade-off in test execution speed.

## Consequences

- **Positive:** Tests are completely deterministic. Developers do not need to learn a new factory DSL (domain-specific language); they just use the CRUD methods they already know.
- **Positive:** We avoid duplicating complex tenant-creation business logic just for the sake of testing.
- **Negative:** The "Nuke & Restart" strategy is slower than nested transactions. If the test suite becomes a bottleneck in the future, we will optimize _how_ we wipe the data (e.g., using TRUNCATE CASCADE instead of dropping tables) rather than abandoning the strategy.

## Implementation Guidelines / Coding Standards

To execute this architectural decision, all tests must adhere to the following coding guidelines:

1. **Setup Code Belongs in Fixtures:** Do not write manual database dependency setup code inside individual test functions. Replace legacy shallow factories by moving complex setups into Pytest fixtures that yield a specific state (e.g., DocumentTestState).
2. **Commit at the End of Fixtures:** To resolve transaction isolation bugs between the test setup and the FastAPI endpoint, **always** call db_session.commit() (and refresh() your objects) at the very end of your setup fixture before returning/yielding the state.
3. **Organize Fixture Scope:** Prevent a monolithic conftest.py.
   - Use pytest_plugins in the root conftest.py to modularize global/common setups.
   - Use nested conftest.py files inside feature directories (e.g., test/memo/conftest.py) for domain-specific fixtures.
4. **Use Direct CRUD/Service Calls:** Do not use factory_boy or attempt to build "smart", dependency-resolving factories. Rely on actual Service classes to orchestrate heavy root elements (like Projects) and direct CRUD class calls for leaf nodes.
