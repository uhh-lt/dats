import { useMemo } from "react";
import { KeywordStat, SpanEntityDocumentFrequency, TagStat } from "../../../api/openapi";

export function useFilterStats<T extends Array<KeywordStat | TagStat | SpanEntityDocumentFrequency>>(
  statsData: T,
  statsSearchBarValue: string
): T {
  const filteredStatsData = useMemo(() => {
    // Filter stats data based on search bar value
    return statsData
      ? statsData.filter((stats) => {
          if ("keyword" in stats) {
            return stats !== undefined && stats.keyword.toLowerCase().startsWith(statsSearchBarValue.toLowerCase());
          } else if ("tag" in stats) {
            return stats !== undefined && stats.tag.title.toLowerCase().startsWith(statsSearchBarValue.toLowerCase());
          } else if ("span_text" in stats) {
            return stats !== undefined && stats.span_text.toLowerCase().startsWith(statsSearchBarValue.toLowerCase());
          } else {
            return {};
          }
        })
      : [];
  }, [statsSearchBarValue, statsData]);

  return filteredStatsData as T;
}
