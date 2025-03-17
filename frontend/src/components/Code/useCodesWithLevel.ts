import { useMemo } from "react";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { CodeReadWithLevel } from "../TreeExplorer/CodeReadWithLevel.ts";

export function buildCodeWithLevel(
  allCodes: CodeRead[],
  parentId: number | null = null,
  level = 0,
): CodeReadWithLevel[] {
  const result: CodeReadWithLevel[] = [];

  allCodes
    .filter((c) => c.parent_id === parentId)
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
