import { useMemo } from "react";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { DocumentTagReadWithLevel } from "../TreeExplorer/TagReadWithLevel.ts";

/**
 * Recursively builds a flat list of tags with their hierarchy level
 */

export function buildTagWithLevel(
  allTags: DocumentTagRead[],
  parentId: number | null = null,
  level = 0,
): DocumentTagReadWithLevel[] {
  const result: DocumentTagReadWithLevel[] = [];

  allTags
    .filter((t) => t.parent_id === parentId)
    .forEach((tag) => {
      result.push({ data: tag, level });
      result.push(...buildTagWithLevel(allTags, tag.id, level + 1));
    });

  return result;
}

/**
 * Hook to transform a flat list of tags into a hierarchical structure
 */

export function useTagsWithLevel(tags: DocumentTagRead[]) {
  return useMemo(() => {
    return buildTagWithLevel(tags, null, 0);
  }, [tags]);
}
