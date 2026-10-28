# DATS Project Doctor

Finds inconsistencies between the data stores of a DATS instance (Postgres, filesystem, Elasticsearch, Weaviate), for example documents whose file is missing, and heals them.

```bash
tools/project_doctor/dats-doctor.sh check --project 27 -o report.json   # changes nothing
tools/project_doctor/dats-doctor.sh heal report.json                    # dry run
tools/project_doctor/dats-doctor.sh heal report.json --apply
```

The wrapper runs the doctor in a one-off container of the deployment's backend image (`docker/`), with the instance's own environment and volumes. `--local` (or `just doctor ...`) runs it against the dev stack of the checkout.

The doctor imports no DATS code, only the libraries of the backend environment, so it works with the DATS version the deployment runs. It verifies the database schema before it touches anything.

See [docs/admin/project-doctor.md](../../docs/admin/project-doctor.md) for the checks, the fixes and how heal stays safe.

| File                    | Content                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `dats-doctor.sh`        | Wrapper: runs the doctor in docker or against the dev stack    |
| `dats_doctor.py`        | CLI (`check`, `heal`)                                          |
| `doctor_stores.py`      | Connections, naming and schema check of the data stores        |
| `doctor_checks.py`      | The checks (read only)                                         |
| `doctor_portability.py` | The checks for data the project export or import cannot handle |
| `doctor_json_repair.py` | The repairs of whiteboard contents and timeline filters        |
| `doctor_heal.py`        | The fixes                                                      |
| `doctor_report.py`      | The report format (issues and their fixes)                     |
