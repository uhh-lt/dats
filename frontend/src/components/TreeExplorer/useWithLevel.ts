import { useMemo } from "react";
import { NamedObjWithParent, NamedObjWithParentWithLevel } from "./ITree.ts";

/**
 * Recursively builds a flat list of tags with their hierarchy level
 */

export function buildWithLevel<T extends NamedObjWithParent>(
  allTags: T[],
  parentId: number | null = null,
  level = 0,
): NamedObjWithParentWithLevel<T>[] {
  const result: NamedObjWithParentWithLevel<T>[] = [];

  allTags
    .filter((t) => t.parent_id === parentId)
    .forEach((tag) => {
      result.push({ data: tag, level });
      result.push(...buildWithLevel(allTags, tag.id, level + 1));
    });

  return result;
}

/**
 * Hook to transform a flat list of tags into a hierarchical structure
 */

export function useWithLevel<T extends NamedObjWithParent>(data: T[]) {
  return useMemo(() => {
    return buildWithLevel(data, null, 0);
  }, [data]);
}
