import { useMemo } from "react";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { CodeReadWithLevel } from "../TreeExplorer/CodeReadWithLevel.ts";

function buildCodeWithLevel(allCodes: CodeRead[], parentId: number | null = null, level = 0): CodeReadWithLevel[] {
  const result: CodeReadWithLevel[] = [];

  const hasParentInList = (code: CodeRead) => allCodes.some((c) => c.id === code.parent_id);

  allCodes
    .filter((c) =>
      parentId === null
        ? !hasParentInList(c) // For root level, include codes whose parents are not in the list
        : c.parent_id === parentId,
    )
    .forEach((code) => {
      result.push({ data: code, level });
      result.push(...buildCodeWithLevel(allCodes, code.id, level + 1));
    });

  return result;
}

export function useCodesWithLevel(codes: CodeRead[]) {
  return useMemo(() => {
    return buildCodeWithLevel(codes, null, 0);
  }, [codes]);
}
