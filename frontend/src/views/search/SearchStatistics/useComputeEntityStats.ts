import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { SpanEntityStat } from "../../../api/openapi";
import SearchHooks from "../../../api/SearchHooks";

function computeCodeFrequencies(codeStats: SpanEntityStat[]): Map<number, Map<string, number>> {
  // aggregate the query result, creating a mapping of codeId -> text -> count
  const aggregatedCodeStats = new Map<number, Map<string, number>>(); // e.g. [9: [Germany: 5, Berlin: 3], PER: [Tim: 1]]
  codeStats.forEach((stat) => {
    // aggregate the counts per SpanEntity
    let entityMap = aggregatedCodeStats.get(stat.span_entity.code_id);
    if (!entityMap) {
      entityMap = new Map<string, number>();
      entityMap.set(stat.span_entity.span_text, stat.count);
      aggregatedCodeStats.set(stat.span_entity.code_id, entityMap);
    } else {
      let entityCount = entityMap.get(stat.span_entity.span_text) || 0;
      entityMap.set(stat.span_entity.span_text, entityCount + stat.count);
    }
  });

  return aggregatedCodeStats;
}

export default function useComputeEntityStats(sdocIds: number[] | undefined) {
  // get the current project id
  const { projectId } = useParams() as { projectId: string };

  // query code statistics for all provided sdocIds
  const codeStats = SearchHooks.useSearchEntityStats(parseInt(projectId), sdocIds);

  // aggregate the query result, creating a mapping of code -> text -> count
  return useMemo(() => computeCodeFrequencies(codeStats.data || []), [codeStats.data]);
}
