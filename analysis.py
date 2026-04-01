import ast
import os
from collections import defaultdict

# WHITELIST = ["query.update", "job.update", "query.delete", "job.delete"]
WHITELIST = []
BLACKLIST = ["update_timestamp", "exists_or_create", "update_multi_with_doctype"]
target_dir = "./backend/src"


class TransactionScanner:
    def __init__(self, whitelist=None, blacklist=None):
        self.whitelist = set(whitelist or [])

        # Blacklist: Functions we KNOW commit indirectly
        self.blacklist = set(blacklist or [])
        self.committing_functions = set(self.blacklist)

        self.call_graph = defaultdict(list)
        self.func_locations = {}
        self.func_params_db = {}

    def _has_commit(self, node):
        for child in ast.walk(node):
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute):
                if child.func.attr == "commit":
                    return True
        return False

    def _has_db_parameter(self, node):
        for arg in node.args.args:
            if arg.arg == "db":
                return True
        for arg in node.args.kwonlyargs:
            if arg.arg == "db":
                return True
        if hasattr(node.args, "posonlyargs"):
            for arg in node.args.posonlyargs:
                if arg.arg == "db":
                    return True
        return False

    def _passes_db_arg(self, call_node):
        for arg in call_node.args:
            if isinstance(arg, ast.Name) and arg.id == "db":
                return True
        for kw in call_node.keywords:
            if kw.arg == "db" or (
                isinstance(kw.value, ast.Name) and kw.value.id == "db"
            ):
                return True
        return False

    def _get_called_functions(self, node):
        calls = []

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            nodes_to_walk = node.body
        else:
            nodes_to_walk = [node]

        for n in nodes_to_walk:
            for child in ast.walk(n):
                if isinstance(child, ast.Call):
                    passes_db = self._passes_db_arg(child)

                    if isinstance(child.func, ast.Name):
                        func_name = child.func.id
                        if func_name not in self.whitelist:
                            calls.append({"name": func_name, "passes_db": passes_db})

                    elif isinstance(child.func, ast.Attribute):
                        attr_name = child.func.attr

                        if isinstance(child.func.value, ast.Name):
                            full_name = f"{child.func.value.id}.{attr_name}"
                            if (
                                full_name in self.whitelist
                                or attr_name in self.whitelist
                            ):
                                continue
                        elif attr_name in self.whitelist:
                            continue

                        calls.append({"name": attr_name, "passes_db": passes_db})

        return calls

    def first_pass(self, directory):
        for root, _, files in os.walk(directory):
            for file in files:
                if not file.endswith(".py"):
                    continue
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    try:
                        tree = ast.parse(f.read())
                        for node in ast.walk(tree):
                            if isinstance(
                                node, (ast.FunctionDef, ast.AsyncFunctionDef)
                            ):
                                self.func_params_db[node.name] = self._has_db_parameter(
                                    node
                                )

                                if (
                                    self._has_commit(node)
                                    and node.name not in self.whitelist
                                ):
                                    self.committing_functions.add(node.name)
                                    self.func_locations[node.name] = (
                                        f"{path}:{node.lineno}"
                                    )
                    except Exception:
                        continue

    def second_pass(self, directory):
        violations = []
        for root, _, files in os.walk(directory):
            for file in files:
                if not file.endswith(".py"):
                    continue
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    try:
                        tree = ast.parse(f.read())
                        for node in ast.walk(tree):
                            if isinstance(
                                node, (ast.FunctionDef, ast.AsyncFunctionDef)
                            ):
                                calls = self._get_called_functions(node)

                                committing_children_names = set()
                                children_details = []

                                for c in calls:
                                    name = c["name"]

                                    # only add to the list if the call explicitly passed 'db'
                                    if (
                                        name in self.committing_functions
                                        and c["passes_db"]
                                    ):
                                        committing_children_names.add(name)

                                        has_db_def = self.func_params_db.get(
                                            name, "Unknown (External/Blacklisted)"
                                        )
                                        detail = f"{name} (expects 'db': {has_db_def})"

                                        if detail not in children_details:
                                            children_details.append(detail)

                                has_own_commit = self._has_commit(node)
                                num_committing = len(committing_children_names)

                                if num_committing > 1 or (
                                    num_committing >= 1 and has_own_commit
                                ):
                                    violations.append(
                                        {
                                            "file": path,
                                            "func": node.name,
                                            "line": node.lineno,
                                            "children": list(committing_children_names),
                                            "children_details": children_details,
                                            "own_commit": has_own_commit,
                                        }
                                    )
                    except Exception:
                        continue
        return violations


# --- analysis ---
scanner = TransactionScanner(whitelist=WHITELIST, blacklist=BLACKLIST)

print(f"PASS 1: Mapping committing functions in {target_dir}")
scanner.first_pass(target_dir)
print(
    f"Found {len(scanner.committing_functions)} functions that call db.commit() or are blacklisted."
)

print("PASS 2: Identifying nested transaction violations")
violations = scanner.second_pass(target_dir)

if not violations:
    print("No nested commit violations detected.")
else:
    print(f"\nFOUND {len(violations)} POTENTIAL VIOLATIONS:\n")
    for v in violations:
        print(f"Location: {v['file']}:{v['line']}")
        print(f"Function: {v['func']}")
        if v["own_commit"]:
            print("  - Logic: Contains local db.commit()")
        print("  - Logic: Committing sub-functions:")
        for detail in v["children_details"]:
            print(f"      * {detail}")
        print("-" * 50)
