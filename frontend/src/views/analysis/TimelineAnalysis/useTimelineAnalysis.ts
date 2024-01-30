import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AnalysisService, TimelineAnalysisColumns, TimelineAnalysisRead } from "../../../api/openapi";
import { MyFilter } from "../../../features/FilterDialog/filterUtils";

export interface TimelineAnalysisCount {
  date: string;
  [key: string]: number | string;
}

export const useTimelineAnalysis = (timelineAnalysis: TimelineAnalysisRead) => {
  // global client state (react router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const timeline = useQueries({
    queries: timelineAnalysis.concepts.map((concept) => {
      return {
        queryKey: [
          projectId,
          timelineAnalysis.settings.group_by,
          timelineAnalysis.settings.date_metadata_id,
          concept.filter,
        ],
        queryFn: () => {
          return AnalysisService.timelineAnalysis2({
            projectId,
            groupBy: timelineAnalysis.settings.group_by!,
            projectMetadataId: timelineAnalysis.settings.date_metadata_id!,
            requestBody: concept.filter as MyFilter<TimelineAnalysisColumns>, // if concept.type === "filter", data is the root filter id
          });
        },
      };
    }),
  });

  const isLoading = timeline.some((query) => query.isLoading);
  const isError = timeline.some((query) => query.isError);

  // TODO: Is this memo stable? or is it computed every re-render?
  const { counts, date2concept2ids, isSuccess } = useMemo(() => {
    console.log("memomemomomo");

    if (!timeline.every((query) => query.isSuccess)) return { counts: [], date2concept2ids: {}, isSuccess: false };
    const timelineAnalysisResults = timeline.map((query) => query.data!);

    // merge results
    // the keys of the intermediate result
    const dates = Array.from(new Set(timelineAnalysisResults.flat().map((result) => result.date)));

    // results as maps
    const date2concept2counts: Record<string, Record<string, number>> = dates.reduce((previousValue, currentValue) => {
      return { ...previousValue, [currentValue]: {} };
    }, {});
    const date2concept2ids: Record<string, Record<string, number[]>> = dates.reduce((previousValue, currentValue) => {
      return { ...previousValue, [currentValue]: {} };
    }, {});

    timelineAnalysisResults.forEach((taResult, index) => {
      const concept = timelineAnalysis.concepts[index]; //  The order returned by useQueries is the same as the input order.

      taResult.forEach((result) => {
        date2concept2counts[result.date][concept.name] = result.sdoc_ids.length;
        date2concept2ids[result.date][concept.name] = result.sdoc_ids;
      });
    });

    // results as list (as required by recharts)
    const counts: TimelineAnalysisCount[] = dates.map((date) => {
      return {
        date,
        ...date2concept2counts[date],
      };
    });

    return { counts, date2concept2ids, isSuccess: true };
  }, [timelineAnalysis.concepts, timeline]);

  return { isSuccess, isLoading, isError, counts, date2concept2ids };
};
