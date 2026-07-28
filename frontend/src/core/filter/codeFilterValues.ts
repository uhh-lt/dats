import { MyFilterExpression } from "./filterUtils";

export interface ParsedCodeFilterValue {
  conceptId?: string;
  branchId?: number | null;
  snapshotId?: number;
}

export function parseCodeFilterValue(value: MyFilterExpression["value"]): ParsedCodeFilterValue {
  if (typeof value !== "string") return {};

  const snapshotMatch = /^code-snapshot:(\d+)$/.exec(value);
  if (snapshotMatch) return { snapshotId: Number(snapshotMatch[1]) };

  const conceptMatch = /^code-concept:([^:]+):(main|branch:(\d+))$/.exec(value);
  if (!conceptMatch) return {};
  return {
    conceptId: conceptMatch[1],
    branchId: conceptMatch[2] === "main" ? null : Number(conceptMatch[3]),
  };
}

export function createCodeConceptFilterValue(conceptId: string, branchId: number | null) {
  return `code-concept:${conceptId}:${branchId === null ? "main" : `branch:${branchId}`}`;
}

export function createCodeSnapshotFilterValue(codeId: number) {
  return `code-snapshot:${codeId}`;
}
