import { useMemo } from "react";
import { KeywordStat, SpanEntityDocumentFrequency, TagStat } from "../../../api/openapi";

export function useFilterStats<T extends Array<KeywordStat | TagStat | SpanEntityDocumentFrequency>>(
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
            return stats !== undefined && stats.tag.title.toLowerCase().startsWith(filterBy.toLowerCase());
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
