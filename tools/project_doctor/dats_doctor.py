"""DATS project doctor: finds inconsistencies between the data stores of a DATS
instance (Postgres, filesystem, Elasticsearch, Weaviate) and heals them.

    dats_doctor.py check [--project ID ...] [-o report.json]
    dats_doctor.py heal report.json [--only CHECK ...] [--apply]

Runs inside the DATS backend environment (see README.md); use the wrapper
script dats-doctor.sh.
"""

import argparse
import sys
import warnings
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from doctor_report import CheckName, Issue, Report, ReportScope
from loguru import logger

from bootstrap import close_repos, init_services, register_jobs
from config import conf
from repos.db.sql_repo import SQLRepo
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.redis_repo import RedisRepo
from repos.repo_base import RepoBase
from repos.vector.weaviate_repo import WeaviateRepo

# heal deletes documents first and checks again, so that the other fixes do not
# act on documents that are gone by then
_FIRST_ROUND_ACTIONS = {"delete_sdocs"}


def _connect() -> list[RepoBase]:
    """Connects the data stores (not the ML services, which heal never calls)."""
    repos: list[RepoBase] = [
        FilesystemRepo(),
        SQLRepo(),
        ElasticSearchRepo(),
        WeaviateRepo(),
        RedisRepo(),
    ]
    for repo in repos:
        repo.connect()
    return repos


def _run_checks(scope: ReportScope) -> list[Issue]:
    from doctor_checks import Checker

    with SQLRepo().transaction() as db:
        return Checker(db=db, min_file_age_minutes=scope.min_file_age_minutes).run(
            project_ids=scope.project_ids, instance=scope.instance
        )


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
def check(args: argparse.Namespace) -> int:
    scope = ReportScope(
        project_ids=args.project or None,
        # leftovers of deleted projects belong to no project, so they are only
        # checked when the whole instance is checked
        instance=not args.project,
        min_file_age_minutes=args.min_file_age,
    )
    issues = _run_checks(scope)
    report = Report(
        created=datetime.now(),
        dats_version=conf.api.version,
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


def heal(args: argparse.Namespace) -> int:
    from doctor_heal import Healer

    report = Report.load(Path(args.report))
    if report.dats_version != conf.api.version:
        logger.warning(
            f"The report was created by DATS {report.dats_version}, this is "
            f"{conf.api.version}"
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
        fresh = [i for i in _run_checks(report.scope) if i.key in wanted]
        print(f"Dry run: heal would apply these {len(fresh)} fixes:")
        _print_issues(fresh, limit=None)
        print(
            f"\n{len(wanted) - len(fresh)} issues of the report are resolved "
            "already. Run again with --apply to heal."
        )
        return 0

    # recompute jobs need the job queues
    with warnings.catch_warnings():
        # registering the jobs imports the ML libraries, which warn a lot
        warnings.simplefilter("ignore")
        register_jobs()
    init_services()
    quarantine_dir = Healer.new_quarantine_dir()

    applied, failed = 0, 0
    for round_no in (1, 2):
        fresh = [i for i in _run_checks(report.scope) if i.key in wanted]
        if round_no == 1:
            fresh = [i for i in fresh if i.fix and i.fix.action in _FIRST_ROUND_ACTIONS]
        for issue in fresh:
            wanted.discard(issue.key)
            try:
                with SQLRepo().transaction() as db:
                    result = Healer(db=db, quarantine_dir=quarantine_dir).apply(issue)
                applied += 1
                print(f"  OK   {issue.key}: {result}")
            except Exception as e:
                failed += 1
                logger.exception(e)
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

    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Show the DATS info logs"
    )

    args = parser.parse_args()
    # the issues are the output, the DATS logs only distract from them
    logger.remove()
    logger.add(sys.stderr, level="INFO" if args.verbose else "WARNING")
    repos = _connect()
    try:
        return args.func(args)
    finally:
        close_repos(repos)


if __name__ == "__main__":
    sys.exit(main())
