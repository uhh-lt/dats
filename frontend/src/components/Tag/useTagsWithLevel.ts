import { useMemo } from "react";
import { TagRead } from "../../api/openapi/models/TagRead.ts";
import { TagReadWithLevel } from "../TreeExplorer/TagReadWithLevel.ts";

/**
 * Recursively builds a flat list of tags with their hierarchy level
 */

export function buildTagWithLevel(allTags: TagRead[], parentId: number | null = null, level = 0): TagReadWithLevel[] {
  const result: TagReadWithLevel[] = [];

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

export function useTagsWithLevel(tags: TagRead[]) {
  return useMemo(() => {
    return buildTagWithLevel(tags, null, 0);
  }, [tags]);
}
