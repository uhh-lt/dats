import { useMemo } from "react";
import { KeywordStat } from "../../../../../api/openapi/models/KeywordStat";
import { SpanEntityStat } from "../../../../../api/openapi/models/SpanEntityStat";
import { TagStat } from "../../../../../api/openapi/models/TagStat";

export function useFilterStats<T extends Array<KeywordStat | TagStat | SpanEntityStat>>(
  statsData: T,
  filterBy: string,
): T {
  const filteredStatsData = useMemo(() => {
    // Filter stats data based on search bar value
    return statsData
      ? statsData.filter((stats) => {
          if ("keyword" in stats) {
            return stats !== undefined && stats.keyword.toLowerCase().startsWith(filterBy.toLowerCase());
          } else if ("tag" in stats) {
            return stats !== undefined && stats.tag.name.toLowerCase().startsWith(filterBy.toLowerCase());
          } else if ("span_text" in stats) {
            return stats !== undefined && stats.span_text.toLowerCase().startsWith(filterBy.toLowerCase());
          } else {
            return [];
          }
        })
      : [];
  }, [filterBy, statsData]);

  return filteredStatsData as T;
}
