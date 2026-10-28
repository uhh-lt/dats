"""DATS project doctor: finds inconsistencies between the data stores of a DATS
instance (Postgres, filesystem, Elasticsearch, Weaviate) and heals them.

    dats_doctor.py check [--project ID ...] [-o report.json]
    dats_doctor.py heal report.json [--only CHECK ...] [--apply]

Imports no DATS code, so it works with every DATS version whose database has
the tables it needs (see doctor_stores.py). Use the wrapper dats-doctor.sh,
which runs it in the environment of the backend.
"""

import argparse
import sys
import traceback
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from doctor_checks import Checker
from doctor_heal import Healer
from doctor_report import CheckName, Issue, Report, ReportScope
from doctor_stores import Stores, UnsupportedSchemaError, connect

# heal deletes documents first and checks again, so that the other fixes do not
# act on documents that are gone by then
_FIRST_ROUND_ACTIONS = {"delete_sdocs"}


def _run_checks(stores: Stores, scope: ReportScope) -> list[Issue]:
    with stores.db.connect() as conn:
        return Checker(
            conn=conn, stores=stores, min_file_age_minutes=scope.min_file_age_minutes
        ).run(project_ids=scope.project_ids, instance=scope.instance)


def _print_issues(issues: list[Issue], *, limit: int | None) -> None:
    by_check: dict[CheckName, list[Issue]] = defaultdict(list)
    for issue in issues:
        by_check[issue.check].append(issue)

    for check in CheckName:
        found = by_check.get(check, [])
        if not found:
            continue
        fixable = sum(1 for issue in found if issue.fix is not None)
        print(f"\n## {check.value}: {len(found)} issues ({fixable} fixable by heal)")
        for issue in found[:limit]:
            fix = issue.fix.action if issue.fix is not None else "manual"
            print(f"  - [{fix}] {issue.message}")
            if issue.hint:
                print(f"      hint: {issue.hint}")
        if limit is not None and len(found) > limit:
            print(f"  ... {len(found) - limit} more (see the report, or --all)")


# ==============================================================================
# COMMANDS
# ==============================================================================
def check(stores: Stores, args: argparse.Namespace) -> int:
    scope = ReportScope(
        project_ids=args.project or None,
        # leftovers of deleted projects belong to no project, so they are only
        # checked when the whole instance is checked
        instance=not args.project,
        min_file_age_minutes=args.min_file_age,
    )
    issues = _run_checks(stores, scope)
    report = Report(
        created=datetime.now(),
        schema_revision=stores.schema_revision(),
        scope=scope,
        issues=issues,
    )
    output = Path(
        args.output or f"dats-doctor-report_{datetime.now():%Y-%m-%d_%H-%M-%S}.json"
    )
    report.save(output)

    _print_issues(issues, limit=None if args.all else 20)
    print(f"\n{len(issues)} issues found. Report written to {output}")
    if issues:
        print(
            "Review the report (remove the issues that heal must not touch), then "
            f"run: heal {output}"
        )
    return 1 if issues else 0


def heal(stores: Stores, args: argparse.Namespace) -> int:
    report = Report.load(Path(args.report))
    revision = stores.schema_revision()
    if report.schema_revision != revision:
        print(
            f"warning: the report was created at database revision "
            f"{report.schema_revision}, the database is at {revision}",
            file=sys.stderr,
        )
    only = {CheckName(c) for c in args.only} if args.only else None
    wanted = {
        issue.key
        for issue in report.issues
        if issue.fix is not None and (only is None or issue.check in only)
    }
    if not wanted:
        print("The report contains no fixable issues.")
        return 0

    if not args.apply:
        # the fixes are taken from a fresh check, the state may have changed
        fresh = [i for i in _run_checks(stores, report.scope) if i.key in wanted]
        print(f"Dry run: heal would apply these {len(fresh)} fixes:")
        _print_issues(fresh, limit=None)
        print(
            f"\n{len(wanted) - len(fresh)} issues of the report are resolved "
            "already. Run again with --apply to heal."
        )
        return 0

    quarantine_dir = Healer.new_quarantine_dir(stores)
    applied, failed = 0, 0
    for round_no in (1, 2):
        fresh = [i for i in _run_checks(stores, report.scope) if i.key in wanted]
        if round_no == 1:
            fresh = [i for i in fresh if i.fix and i.fix.action in _FIRST_ROUND_ACTIONS]
        for issue in fresh:
            wanted.discard(issue.key)
            try:
                # one transaction per fix: a failing fix does not undo the others
                with stores.db.begin() as conn:
                    result = Healer(
                        conn=conn, stores=stores, quarantine_dir=quarantine_dir
                    ).apply(issue)
                applied += 1
                print(f"  OK   {issue.key}: {result}")
            except Exception as e:
                failed += 1
                if args.verbose:
                    traceback.print_exc()
                print(f"  FAIL {issue.key}: {e}")

    print(
        f"\nApplied {applied} fixes, {failed} failed, {len(wanted)} were resolved "
        "already. Run check again to verify."
    )
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find and heal inconsistencies between the data stores of DATS."
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Print the tracebacks of errors"
    )
    commands = parser.add_subparsers(dest="command", required=True)

    check_parser = commands.add_parser(
        "check", help="Check projects and write a report (changes nothing)"
    )
    check_parser.add_argument(
        "--project",
        type=int,
        action="append",
        help="Project id to check (repeatable). Default: all projects and the "
        "leftovers of deleted projects.",
    )
    check_parser.add_argument("-o", "--output", help="Path of the JSON report")
    check_parser.add_argument(
        "--min-file-age",
        type=int,
        default=60,
        help="Only report unreferenced files older than this many minutes, as "
        "younger files may still be processed (default: 60)",
    )
    check_parser.add_argument(
        "--all", action="store_true", help="Print all issues, not 20 per check"
    )
    check_parser.set_defaults(func=check)

    heal_parser = commands.add_parser(
        "heal", help="Fix the issues of a report (dry run unless --apply)"
    )
    heal_parser.add_argument("report", help="Path of the JSON report of check")
    heal_parser.add_argument(
        "--only",
        action="append",
        choices=[c.value for c in CheckName],
        help="Only fix issues of this check (repeatable)",
    )
    heal_parser.add_argument(
        "--apply", action="store_true", help="Apply the fixes (default: dry run)"
    )
    heal_parser.set_defaults(func=heal)

    args = parser.parse_args()
    try:
        stores = connect()
    except (UnsupportedSchemaError, ConnectionError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    try:
        return args.func(stores, args)
    except ValueError as e:  # e.g. an unknown project id
        print(f"error: {e}", file=sys.stderr)
        return 2
    finally:
        stores.close()


if __name__ == "__main__":
    sys.exit(main())
